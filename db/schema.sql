-- =====================================================================
-- Sistema de Gestión de Inventario Multialmacén
-- Distribuciones Dyno S.C.R.L.
--
-- Esquema de base de datos (PostgreSQL / Supabase).
-- Ejecutar PRIMERO en el SQL Editor de Supabase y luego db/seed_inicial.sql.
--
-- Alcance: solo control de almacén. No incluye ventas, comprobantes
-- ni medios de pago (observación del asesor, Prácticas 3 y 7).
--
-- Siete entidades: sucursales, perfiles, categorias, productos,
-- stock_minimo, movimientos (Kardex) y ajustes.
-- =====================================================================

-- gen_random_uuid() es nativo desde PostgreSQL 13 (Supabase usa 15+).

-- ---------------------------------------------------------------------
-- 1. sucursales: almacenes de la empresa (O10, G9, I7 y los que se agreguen)
-- ---------------------------------------------------------------------
create table if not exists sucursales (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique check (codigo ~ '^[A-Z0-9]{1,10}$'),
  nombre     text not null,
  direccion  text,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. perfiles: datos del usuario de Supabase Auth y su rol
--    ENCARGADO: opera el almacén asignado.
--    GERENTE: opera todos los almacenes, aprueba ajustes y administra.
-- ---------------------------------------------------------------------
create table if not exists perfiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombre       text not null,
  rol          text not null default 'ENCARGADO' check (rol in ('ENCARGADO', 'GERENTE')),
  id_sucursal  uuid references sucursales(id),
  activo       boolean not null default true,
  creado_en    timestamptz not null default now(),
  constraint encargado_con_sucursal check (rol = 'GERENTE' or id_sucursal is not null)
);

-- ---------------------------------------------------------------------
-- 3. categorias
-- ---------------------------------------------------------------------
create table if not exists categorias (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null unique
);

-- ---------------------------------------------------------------------
-- 4. productos: el producto es único para la empresa; el stock se lleva
--    por sucursal en el Kardex.
-- ---------------------------------------------------------------------
create table if not exists productos (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique,
  nombre        text not null,
  descripcion   text,
  id_categoria  uuid references categorias(id),
  unidad        text not null default 'Cajas' check (unidad in ('Cajas', 'Yardas', 'Unidades')),
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. stock_minimo: mínimo por producto y sucursal (RF-05)
-- ---------------------------------------------------------------------
create table if not exists stock_minimo (
  id_producto  uuid not null references productos(id) on delete cascade,
  id_sucursal  uuid not null references sucursales(id) on delete cascade,
  cantidad     numeric(12,2) not null default 0 check (cantidad >= 0),
  primary key (id_producto, id_sucursal)
);

-- ---------------------------------------------------------------------
-- 6. ajustes: solicitud de ajuste de inventario con aprobación (RF-10, RF-11)
-- ---------------------------------------------------------------------
create table if not exists ajustes (
  id             uuid primary key default gen_random_uuid(),
  id_producto    uuid not null references productos(id),
  id_sucursal    uuid not null references sucursales(id),
  tipo           text not null check (tipo in ('ENTRADA', 'SALIDA')),
  cantidad       numeric(12,2) not null check (cantidad > 0),
  motivo         text not null check (length(trim(motivo)) >= 5),
  estado         text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
  solicitado_por uuid not null default auth.uid() references perfiles(id),
  revisado_por   uuid references perfiles(id),
  revisado_en    timestamptz,
  creado_en      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. movimientos: Kardex de solo inserción. El saldo y el costo promedio
--    se derivan de esta tabla; nunca se actualiza ni se borra una fila.
-- ---------------------------------------------------------------------
create table if not exists movimientos (
  id                uuid primary key default gen_random_uuid(),
  id_producto       uuid not null references productos(id) on delete restrict,
  id_sucursal       uuid not null references sucursales(id) on delete restrict,
  tipo              text not null check (tipo in (
                      'ENTRADA', 'SALIDA',
                      'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA',
                      'AJUSTE_ENTRADA', 'AJUSTE_SALIDA')),
  cantidad          numeric(12,2) not null check (cantidad > 0),
  costo_unitario    numeric(12,4) not null default 0 check (costo_unitario >= 0),
  id_transferencia  uuid,
  id_ajuste         uuid references ajustes(id),
  referencia        text,
  id_usuario        uuid not null default auth.uid() references perfiles(id),
  creado_en         timestamptz not null default now()
);

create index if not exists idx_movimientos_producto_sucursal
  on movimientos (id_producto, id_sucursal, creado_en);
create index if not exists idx_movimientos_transferencia
  on movimientos (id_transferencia) where id_transferencia is not null;

-- =====================================================================
-- Funciones de apoyo
-- =====================================================================

-- Rol del usuario actual
create or replace function es_gerente() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfiles where id = auth.uid() and rol = 'GERENTE' and activo
  );
$$;

-- Sucursal asignada al usuario actual (null para el gerente)
create or replace function sucursal_usuario() returns uuid
language sql stable security definer set search_path = public as $$
  select id_sucursal from perfiles where id = auth.uid() and activo;
$$;

-- ¿Puede el usuario operar en la sucursal indicada?
create or replace function puede_operar(p_sucursal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select es_gerente() or sucursal_usuario() = p_sucursal;
$$;

-- Stock actual de un producto en una sucursal
create or replace function stock_actual(p_producto uuid, p_sucursal uuid) returns numeric
language sql stable set search_path = public as $$
  select coalesce(sum(case when tipo in ('ENTRADA', 'TRANSFERENCIA_ENTRADA', 'AJUSTE_ENTRADA')
                           then cantidad else -cantidad end), 0)
  from movimientos
  where id_producto = p_producto and id_sucursal = p_sucursal;
$$;

-- Costo promedio ponderado vigente (RF-03). Recorre el Kardex en orden
-- cronológico con la misma regla que src/lib/calculations.ts.
create or replace function costo_promedio(p_producto uuid, p_sucursal uuid) returns numeric
language plpgsql stable set search_path = public as $$
declare
  v_cantidad numeric := 0;
  v_valor    numeric := 0;
  v_promedio numeric := 0;
  m record;
begin
  for m in
    select tipo, cantidad, costo_unitario from movimientos
    where id_producto = p_producto and id_sucursal = p_sucursal
    order by creado_en, id
  loop
    if m.tipo in ('ENTRADA', 'TRANSFERENCIA_ENTRADA', 'AJUSTE_ENTRADA') then
      v_cantidad := v_cantidad + m.cantidad;
      v_valor    := v_valor + m.cantidad * m.costo_unitario;
      v_promedio := case when v_cantidad > 0 then v_valor / v_cantidad else 0 end;
    else
      v_cantidad := v_cantidad - m.cantidad;
      v_valor    := case when v_cantidad > 0 then v_valor - m.cantidad * v_promedio else 0 end;
    end if;
  end loop;
  return round(v_promedio, 4);
end;
$$;

-- Antes de insertar un movimiento: registra al usuario, valida el stock
-- de las salidas (RF-07) y fija el costo de salida al promedio vigente.
create or replace function validar_movimiento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id_usuario := coalesce(auth.uid(), new.id_usuario);

  if new.tipo in ('SALIDA', 'TRANSFERENCIA_SALIDA', 'AJUSTE_SALIDA') then
    if stock_actual(new.id_producto, new.id_sucursal) < new.cantidad then
      raise exception 'Stock insuficiente: disponible %, solicitado %',
        stock_actual(new.id_producto, new.id_sucursal), new.cantidad
        using errcode = 'P0001';
    end if;
    new.costo_unitario := costo_promedio(new.id_producto, new.id_sucursal);
  elsif new.tipo = 'AJUSTE_ENTRADA' then
    new.costo_unitario := costo_promedio(new.id_producto, new.id_sucursal);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_movimiento on movimientos;
create trigger trg_validar_movimiento
  before insert on movimientos
  for each row execute function validar_movimiento();

-- Transferencia entre sucursales: dos movimientos enlazados en una sola
-- transacción. Si la salida falla por stock, no se registra nada.
create or replace function registrar_transferencia(
  p_producto uuid, p_origen uuid, p_destino uuid, p_cantidad numeric, p_referencia text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id    uuid := gen_random_uuid();
  v_costo numeric;
begin
  if p_origen = p_destino then
    raise exception 'La sucursal de origen y destino deben ser distintas';
  end if;
  if not puede_operar(p_origen) then
    raise exception 'No tiene permiso para transferir desde esta sucursal';
  end if;

  v_costo := costo_promedio(p_producto, p_origen);

  insert into movimientos (id_producto, id_sucursal, tipo, cantidad, costo_unitario, id_transferencia, referencia)
  values (p_producto, p_origen, 'TRANSFERENCIA_SALIDA', p_cantidad, v_costo, v_id, p_referencia);

  insert into movimientos (id_producto, id_sucursal, tipo, cantidad, costo_unitario, id_transferencia, referencia)
  values (p_producto, p_destino, 'TRANSFERENCIA_ENTRADA', p_cantidad, v_costo, v_id, p_referencia);

  return v_id;
end;
$$;

-- Revisión de un ajuste: solo el gerente. Si se aprueba, se genera el
-- movimiento AJUSTE_ENTRADA o AJUSTE_SALIDA en el Kardex.
create or replace function revisar_ajuste(p_ajuste uuid, p_aprobar boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  a ajustes%rowtype;
begin
  if not es_gerente() then
    raise exception 'Solo el gerente puede revisar ajustes';
  end if;

  select * into a from ajustes where id = p_ajuste for update;
  if a.estado <> 'PENDIENTE' then
    raise exception 'El ajuste ya fue revisado';
  end if;

  if p_aprobar then
    insert into movimientos (id_producto, id_sucursal, tipo, cantidad, id_ajuste, referencia)
    values (a.id_producto, a.id_sucursal, 'AJUSTE_' || a.tipo, a.cantidad, a.id, a.motivo);
  end if;

  update ajustes
     set estado = case when p_aprobar then 'APROBADO' else 'RECHAZADO' end,
         revisado_por = auth.uid(),
         revisado_en = now()
   where id = p_ajuste;
end;
$$;

-- =====================================================================
-- Seguridad a nivel de fila (RLS): solo usuarios autenticados
-- =====================================================================
alter table sucursales   enable row level security;
alter table perfiles     enable row level security;
alter table categorias   enable row level security;
alter table productos    enable row level security;
alter table stock_minimo enable row level security;
alter table ajustes      enable row level security;
alter table movimientos  enable row level security;

-- Lectura: cualquier usuario autenticado y activo
create policy "lectura sucursales"   on sucursales   for select to authenticated using (true);
create policy "lectura categorias"   on categorias   for select to authenticated using (true);
create policy "lectura productos"    on productos    for select to authenticated using (true);
create policy "lectura stock_minimo" on stock_minimo for select to authenticated using (true);
create policy "lectura movimientos"  on movimientos  for select to authenticated using (true);
create policy "lectura ajustes"      on ajustes      for select to authenticated using (true);
create policy "lectura perfiles"     on perfiles     for select to authenticated using (true);

-- Sucursales y perfiles: solo el gerente administra
create policy "gerente sucursales" on sucursales for all to authenticated
  using (es_gerente()) with check (es_gerente());
create policy "gerente perfiles" on perfiles for update to authenticated
  using (es_gerente()) with check (es_gerente());

-- Catálogo: encargado y gerente registran y editan
create policy "alta categorias" on categorias for insert to authenticated with check (true);
create policy "alta productos" on productos for insert to authenticated with check (true);
create policy "edicion productos" on productos for update to authenticated using (true) with check (true);
create policy "stock minimo" on stock_minimo for all to authenticated
  using (puede_operar(id_sucursal)) with check (puede_operar(id_sucursal));

-- Kardex: solo inserción, en la sucursal que el usuario puede operar.
-- No existen políticas de UPDATE ni DELETE: el historial es inmutable.
create policy "registro movimientos" on movimientos for insert to authenticated
  with check (puede_operar(id_sucursal) and tipo in ('ENTRADA', 'SALIDA'));

-- Ajustes: el usuario solicita en su sucursal; la revisión va por revisar_ajuste()
create policy "solicitud ajustes" on ajustes for insert to authenticated
  with check (puede_operar(id_sucursal) and estado = 'PENDIENTE');

revoke update, delete on movimientos from anon, authenticated;
revoke all on all tables in schema public from anon;
