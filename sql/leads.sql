-- ============================================================
-- Tabla: leads
-- Proyecto: IM Digital Business School — Landing de captación
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

create table if not exists public.leads (
  id              bigint            generated always as identity primary key,
  created_at      timestamptz       not null default now(),

  -- Datos del formulario
  nombre          text              not null,
  email           text              not null,
  telefono        text              not null,
  programa        text,

  -- Trazabilidad del webhook
  webhook_status  text              not null default 'pending'
                  check (webhook_status in ('pending', 'sent', 'failed')),

  -- UTMs
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_term        text,
  utm_content     text,
  landing_url     text
);

-- Índices útiles para consultas frecuentes
create index if not exists leads_email_idx          on public.leads (email);
create index if not exists leads_created_at_idx     on public.leads (created_at desc);
create index if not exists leads_webhook_status_idx on public.leads (webhook_status);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.leads enable row level security;

-- Sólo el service_role puede leer y escribir desde el backend.
-- El anon key sólo puede insertar (el formulario lo necesita).
create policy "anon can insert leads"
  on public.leads
  for insert
  to anon
  with check (true);

-- Para leer o actualizar desde el cliente usa el service_role key
-- (nunca expongas el service_role key en frontend).
create policy "service role full access"
  on public.leads
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- Vista resumen para el panel de Supabase
-- ============================================================
create or replace view public.leads_summary as
select
  date_trunc('day', created_at) as dia,
  utm_source,
  utm_campaign,
  programa,
  webhook_status,
  count(*)                      as total
from public.leads
group by 1, 2, 3, 4, 5
order by 1 desc;
