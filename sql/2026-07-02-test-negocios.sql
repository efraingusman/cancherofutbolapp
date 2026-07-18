-- Cuentas de prueba: TIENDA y COMPLEJO (para testear funciones de negocio)
-- Se crean como users activos + solicitud aprobada. Registro libre (sin código).
insert into public.users (email, name, role, sub_status, bio, city, nat, phone, whatsapp, address, created_at)
values
  ('test.tienda.canchero@gmail.com', 'Deportes El Crack', 'tienda', 'active',
   'Indumentaria y artículos de fútbol. Camisetas, botines, pelotas y más.',
   'Montevideo', 'Uruguay', '099111222', '59899111222', 'Av. 18 de Julio 1234, Montevideo', now()),
  ('test.complejo.canchero@gmail.com', 'Complejo La Bombonera', 'complejo', 'active',
   'Canchas de F5 y F7 con parrillero, vestuarios y cantina. Reservá online.',
   'Montevideo', 'Uruguay', '099333444', '59899333444', 'Camino Carrasco 5555, Montevideo', now())
on conflict (email) do update set role = excluded.role, sub_status = 'active', name = excluded.name, bio = excluded.bio;

insert into public.business_requests (email, name, role, status, created_at)
values
  ('test.tienda.canchero@gmail.com', 'Deportes El Crack', 'tienda', 'APROBADO', now()),
  ('test.complejo.canchero@gmail.com', 'Complejo La Bombonera', 'complejo', 'APROBADO', now())
on conflict do nothing;
