// Pruebas del modelo de datos sobre PostgreSQL real (PGlite, en memoria):
// triggers, funciones y políticas de db/schema.sql.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const GERENTE = '00000000-0000-0000-0000-000000000001';
const ENCARGADO = '00000000-0000-0000-0000-000000000002';
const db = new PGlite();
let P = '';
let O10 = '';
let G9 = '';

const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows[0];
const actAs = (uid: string) => db.query(`select set_config('app.uid', $1, false)`, [uid]);
const stock = async (branch: string) =>
  Number((await one<{ s: string }>('select stock_actual($1, $2) s', [P, branch])).s);
const insertMovement = (branch: string, tipo: string, cantidad: number, costo = 0) =>
  db.query(
    'insert into movimientos (id_producto, id_sucursal, tipo, cantidad, costo_unitario) values ($1, $2, $3, $4, $5)',
    [P, branch, tipo, cantidad, costo],
  );

beforeAll(async () => {
  // Simulación mínima del esquema auth de Supabase
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  `);
  const dir = join(process.cwd(), 'db');
  await db.exec(readFileSync(join(dir, 'schema.sql'), 'utf8'));
  await db.exec(readFileSync(join(dir, 'seed_inicial.sql'), 'utf8'));
  await db.exec(`
    insert into auth.users values ('${GERENTE}', 'gerente@dyno.pe'), ('${ENCARGADO}', 'o10@dyno.pe');
    insert into perfiles (id, nombre, rol, id_sucursal) values
      ('${GERENTE}', 'Gerente', 'GERENTE', null),
      ('${ENCARGADO}', 'Encargado O10', 'ENCARGADO', (select id from sucursales where codigo = 'O10'));
    insert into productos (codigo, nombre, unidad) values ('DY-001', 'Cinta transparente', 'Cajas');
  `);
  P = (await one<{ id: string }>(`select id from productos where codigo = 'DY-001'`)).id;
  O10 = (await one<{ id: string }>(`select id from sucursales where codigo = 'O10'`)).id;
  G9 = (await one<{ id: string }>(`select id from sucursales where codigo = 'G9'`)).id;
  await actAs(ENCARGADO);
});

describe('Modelo de datos (db/schema.sql)', () => {
  it('crea las siete tablas del modelo', async () => {
    const r = await one<{ n: number }>(`select count(*)::int n from information_schema.tables where table_schema = 'public'`);
    expect(r.n).toBe(7);
  });

  it('BD-01: calcula el costo promedio ponderado igual que la aplicación', async () => {
    await insertMovement(O10, 'ENTRADA', 100, 2.5);
    await insertMovement(O10, 'ENTRADA', 50, 3.1);
    const r = await one<{ c: string }>('select costo_promedio($1, $2) c', [P, O10]);
    expect(Number(r.c)).toBeCloseTo(2.7, 4);
  });

  it('BD-02: la salida se valoriza al promedio y registra al usuario', async () => {
    await insertMovement(O10, 'SALIDA', 60, 999);
    const r = await one<{ costo_unitario: string; id_usuario: string }>(
      `select costo_unitario, id_usuario from movimientos where tipo = 'SALIDA'`,
    );
    expect(Number(r.costo_unitario)).toBeCloseTo(2.7, 4);
    expect(r.id_usuario).toBe(ENCARGADO);
    expect(await stock(O10)).toBe(90);
  });

  it('BD-03: rechaza una salida mayor que el stock', async () => {
    await expect(insertMovement(O10, 'SALIDA', 500)).rejects.toThrow(/Stock insuficiente/);
  });

  it('BD-04: rechaza cantidades iguales a cero', async () => {
    await expect(insertMovement(O10, 'ENTRADA', 0, 1)).rejects.toThrow(/check constraint/);
  });

  it('BD-05: la transferencia genera dos movimientos enlazados', async () => {
    const r = await one<{ t: string }>(`select registrar_transferencia($1, $2, $3, 30, 'Reposición G9') t`, [P, O10, G9]);
    const pair = (await db.query('select tipo from movimientos where id_transferencia = $1', [r.t])).rows;
    expect(pair).toHaveLength(2);
    expect(await stock(O10)).toBe(60);
    expect(await stock(G9)).toBe(30);
  });

  it('BD-06: el encargado no opera otra sucursal ni transfiere a la misma', async () => {
    await expect(db.query('select registrar_transferencia($1, $2, $3, 5)', [P, G9, O10])).rejects.toThrow(/permiso/);
    await expect(db.query('select registrar_transferencia($1, $2, $2, 5)', [P, O10])).rejects.toThrow(/distintas/);
  });

  it('BD-07: solo el gerente aprueba ajustes y el ajuste aprobado mueve el stock', async () => {
    await db.query(
      `insert into ajustes (id_producto, id_sucursal, tipo, cantidad, motivo) values ($1, $2, 'SALIDA', 2, 'Dos cajas dañadas')`,
      [P, O10],
    );
    const { id } = await one<{ id: string }>('select id from ajustes');
    await expect(db.query('select revisar_ajuste($1, true)', [id])).rejects.toThrow(/gerente/);

    await actAs(GERENTE);
    await db.query('select revisar_ajuste($1, true)', [id]);
    const a = await one<{ estado: string; revisado_por: string }>('select estado, revisado_por from ajustes where id = $1', [id]);
    expect(a).toEqual({ estado: 'APROBADO', revisado_por: GERENTE });
    expect(await stock(O10)).toBe(58);
    await expect(db.query('select revisar_ajuste($1, false)', [id])).rejects.toThrow(/ya fue revisado/);
  });

  it('BD-08: el Kardex no tiene políticas de modificación ni borrado', async () => {
    const rows = (await db.query<{ cmd: string }>(`select cmd from pg_policies where tablename = 'movimientos'`)).rows;
    expect(rows.map(r => r.cmd).sort()).toEqual(['INSERT', 'SELECT']);
  });
});
