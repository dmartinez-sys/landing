-- =============================================
-- Tabla: leads
-- Proyecto: Global Máster IM Digital Business School
-- =============================================

create table if not exists leads (
  id             bigserial primary key,
  created_at     timestamptz default now(),

  -- Datos del lead
  nombre         text not null,
  email          text not null,
  telefono       text not null,
  estudios       text,
  modalidad      text,
  motivacion     text,
  observaciones  text,

  -- Geolocalización automática (detectada en frontend)
  pais           text default 'España',
  iso_pais       text default 'ES',

  -- UTMs
  utm_source     text default 'organic',
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  utm_term       text,

  -- Control webhook CRM3C
  webhook_status text default 'pending',  -- pending | sent | failed
  webhook_sent_at timestamptz,
  webhook_error  text
);

-- Índices útiles para filtrar en el dashboard
create index on leads (webhook_status);
create index on leads (utm_source);
create index on leads (created_at desc);

-- Row Level Security: solo el backend (service role) puede leer
-- El anon key solo puede insertar (el formulario)
alter table leads enable row level security;

create policy "Insert público"
  on leads for insert
  to anon
  with check (true);

create policy "Solo admin puede leer"
  on leads for select
  to authenticated
  using (true);
