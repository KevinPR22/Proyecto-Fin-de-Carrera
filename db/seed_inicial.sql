-- =====================================================================
-- Datos iniciales. Ejecutar después de schema.sql.
-- Los usuarios se crean desde Authentication > Users en Supabase
-- (el registro público está deshabilitado) y luego se les asigna su perfil.
-- =====================================================================

insert into sucursales (codigo, nombre, direccion) values
  ('O10', 'Almacén O10', 'Juliaca'),
  ('G9',  'Almacén G9',  'Juliaca'),
  ('I7',  'Almacén I7',  'Juliaca')
on conflict (codigo) do nothing;

insert into categorias (nombre) values
  ('Cinta de embalaje'),
  ('Cinta de color'),
  ('Stretch film'),
  ('Accesorios')
on conflict (nombre) do nothing;

-- Ejemplo de asignación de perfiles (reemplazar los UUID por los de Auth):
-- insert into perfiles (id, nombre, rol, id_sucursal) values
--   ('<uuid-gerente>',   'Gerente General',      'GERENTE',   null),
--   ('<uuid-encargado>', 'Encargado de almacén', 'ENCARGADO', (select id from sucursales where codigo = 'O10'));
