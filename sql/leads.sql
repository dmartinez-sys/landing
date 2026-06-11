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
  estudios        text,
  modalidad       text,
  motivacion      text,
  observaciones   text,

  -- Geolocalización por idioma del navegador
  pais            text              not null default 'España',
  iso_pais        text              not null default 'ES',

  -- Trazabilidad del webhook
  webhook_status  text              not null default 'pending'
                  check (webhook_status in ('pending', 'sent', 'failed')),
  webhook_sent_at timestamptz,
  webhook_error   text,

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

-- Políticas abiertas (el formulario necesita insertar; el anon key solo inserta desde el frontend)
create policy "Insert público" on public.leads for insert with check (true);
create policy "Select público" on public.leads for select using (true);
create policy "Update público" on public.leads for update using (true);

-- GRANTs necesarios para el anon key (REST API)
grant usage on schema public to anon;
grant insert, select, update on public.leads to anon;
grant usage, select on sequence public.leads_id_seq to anon;

-- ============================================================
-- Vista resumen para el panel de Supabase
-- ============================================================
create or replace view public.leads_summary as
select
  date_trunc('day', created_at) as dia,
  pais,
  utm_source,
  utm_campaign,
  modalidad,
  webhook_status,
  count(*)                      as total
from public.leads
group by 1, 2, 3, 4, 5, 6
order by 1 desc;
