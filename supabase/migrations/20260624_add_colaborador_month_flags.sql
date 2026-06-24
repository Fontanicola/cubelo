alter table public.colaboradores add column if not exists envio_mes boolean default false;
alter table public.colaboradores add column if not exists pago_mes boolean default false;
alter table public.colaboradores add column if not exists factura_mes boolean default false;
alter table public.colaboradores add column if not exists datos_bancarios_mes boolean default false;
