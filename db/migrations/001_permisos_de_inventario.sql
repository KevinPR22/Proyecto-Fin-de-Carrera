-- RF-08 y RF-10. Ejecutar sobre una base que ya tiene instalado db/schema.sql.
begin;

create or replace function public.perfil_activo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and activo);
$$;

create or replace function public.puede_operar(p_sucursal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select es_gerente() or coalesce(sucursal_usuario() = p_sucursal, false);
$$;

alter policy "lectura sucursales" on public.sucursales using ((select public.perfil_activo()));
alter policy "lectura categorias" on public.categorias using ((select public.perfil_activo()));
alter policy "lectura productos" on public.productos using ((select public.perfil_activo()));
alter policy "lectura stock_minimo" on public.stock_minimo using ((select public.perfil_activo()));
alter policy "lectura movimientos" on public.movimientos using ((select public.perfil_activo()));
alter policy "lectura ajustes" on public.ajustes using (public.puede_operar(id_sucursal));
alter policy "lectura perfiles" on public.perfiles using ((select public.perfil_activo()));

alter policy "alta categorias" on public.categorias with check ((select public.perfil_activo()));
alter policy "alta productos" on public.productos with check ((select public.perfil_activo()));
alter policy "edicion productos" on public.productos
  using ((select public.perfil_activo())) with check ((select public.perfil_activo()));

alter policy "solicitud ajustes" on public.ajustes
  with check (
    public.puede_operar(id_sucursal) and estado = 'PENDIENTE'
    and solicitado_por = (select auth.uid())
    and revisado_por is null and revisado_en is null
  );

commit;
