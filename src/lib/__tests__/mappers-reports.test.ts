import { describe, expect, it } from 'vitest';
import {
  mapAdjustment,
  mapBranch,
  mapCategory,
  mapExcelRowToProduct,
  mapMinStock,
  mapMovement,
  mapProduct,
  mapProfile,
  toUnit,
} from '../mappers';
import { buildMovementReport, buildStockReport, kardexToTable, sheetToObjects } from '../reportData';
import { buildKardex } from '../calculations';
import { BRANCHES, CINTA, G9, mv, O10 } from './fixtures';

describe('Conversión de filas de la base de datos', () => {
  it('convierte un movimiento de snake_case a camelCase', () => {
    const m = mapMovement({
      id: 'm1',
      id_producto: 'p1',
      id_sucursal: 'b1',
      tipo: 'ENTRADA',
      cantidad: '12.5',
      costo_unitario: '3.2',
      creado_en: '2026-10-01T10:00:00Z',
      id_usuario: 'u1',
      referencia: 'GR 001',
      id_transferencia: null,
    });
    expect(m).toMatchObject({ productId: 'p1', branchId: 'b1', quantity: 12.5, unitCost: 3.2, reference: 'GR 001' });
    expect(m.transferId).toBeUndefined();
  });

  it('convierte producto, sucursal, categoría, mínimo, perfil y ajuste', () => {
    expect(mapProduct({ id: 'p', codigo: 'DY-1', nombre: 'X', unidad: 'Rollos', activo: false })).toMatchObject({
      unit: 'Cajas',
      active: false,
      categoryId: null,
    });
    expect(mapBranch({ id: 'b', codigo: 'O10', nombre: 'Almacén' }).active).toBe(true);
    expect(mapCategory({ id: 'c', nombre: 'Cintas' })).toEqual({ id: 'c', name: 'Cintas' });
    expect(mapMinStock({ id_producto: 'p', id_sucursal: 'b', cantidad: 'x' }).quantity).toBe(0);
    expect(mapProfile({ id: 'u', nombre: 'Ana', rol: 'GERENTE' }, 'a@x.pe')).toMatchObject({ role: 'GERENTE', branchId: null });
    expect(mapProfile({ id: 'u', rol: 'OTRO', id_sucursal: 'b' }, 'a@x.pe')).toMatchObject({ role: 'ENCARGADO', name: 'a@x.pe' });
    expect(mapAdjustment({ id: 'a', tipo: 'SALIDA', cantidad: 2, estado: 'APROBADO' })).toMatchObject({
      type: 'SALIDA',
      status: 'APROBADO',
    });
    expect(toUnit('Yardas')).toBe('Yardas');
  });

  it('lee una fila de Excel con o sin tildes y descarta filas incompletas', () => {
    const categories = [{ id: 'c1', name: 'Cinta de embalaje' }];
    expect(
      mapExcelRowToProduct({ 'Código': 'DY-050', Producto: 'Cinta', Categoria: 'cinta de embalaje', Unidad: 'Unidades' }, categories),
    ).toEqual({ code: 'DY-050', name: 'Cinta', description: '', categoryId: 'c1', unit: 'Unidades' });
    expect(mapExcelRowToProduct({ Codigo: '', Producto: 'Sin código' }, categories)).toBeNull();
  });
});

describe('Datos de reportes (RF-06)', () => {
  const movements = [mv('ENTRADA', 10, 4, O10.id), mv('ENTRADA', 6, 5, G9.id), mv('SALIDA', 2, 0, O10.id)];

  it('stock por sucursal con total y valor', () => {
    const [row] = buildStockReport([CINTA], BRANCHES, movements, [{ id: 'c-1', name: 'Cintas' }]);
    expect(row.perBranch).toEqual([8, 6, 0]);
    expect(row.total).toBe(14);
    expect(row.value).toBe(62);
    expect(row.category).toBe('Cintas');
  });

  it('movimientos filtrados por sucursal y periodo', () => {
    expect(buildMovementReport(movements, [CINTA], BRANCHES, undefined, undefined, O10.id)).toHaveLength(2);
    expect(buildMovementReport(movements, [CINTA], BRANCHES, new Date('2030-01-01'))).toHaveLength(0);
    expect(buildMovementReport(movements, [CINTA], BRANCHES, undefined, new Date('2000-01-01'))).toHaveLength(0);
    expect(buildMovementReport(movements, [], [])[0]).toMatchObject({ code: '', branch: '' });
  });

  it('tabla de Kardex para el PDF', () => {
    const table = kardexToTable(buildKardex(movements, CINTA.id, O10.id), n => n.toFixed(2));
    expect(table).toHaveLength(2);
    expect(table[1][3]).toBe('2');
    expect(table[1][7]).toBe('32.00');
  });

  it('convierte una hoja con encabezados en objetos', () => {
    expect(sheetToObjects([['Codigo', 'Producto'], ['DY-1', 'Cinta'], ['DY-2']])).toEqual([
      { Codigo: 'DY-1', Producto: 'Cinta' },
      { Codigo: 'DY-2', Producto: '' },
    ]);
    expect(sheetToObjects([['Codigo']])).toEqual([]);
  });
});
