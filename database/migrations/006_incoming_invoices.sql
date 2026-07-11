create table if not exists public.incoming_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  file_name text not null,
  supplier text not null default 'Onbekende leverancier',
  invoice_number text not null default '',
  invoice_date date not null default current_date,
  due_date date not null default current_date + 30,
  total numeric not null default 0,
  vat_total numeric not null default 0,
  category text not null default 'Inkoopkosten',
  confidence integer not null default 0 check (confidence >= 0 and confidence <= 100),
  status text not null default 'Controle nodig',
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incoming_invoices_company_id on public.incoming_invoices(company_id);
create index if not exists idx_incoming_invoices_status on public.incoming_invoices(company_id, status);

alter table public.incoming_invoices enable row level security;

drop policy if exists "members read incoming invoices" on public.incoming_invoices;
drop policy if exists "editors manage incoming invoices" on public.incoming_invoices;

create policy "members read incoming invoices"
on public.incoming_invoices
for select
using (public.is_company_member(company_id));

create policy "editors manage incoming invoices"
on public.incoming_invoices
for all
using (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[]))
with check (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[]));
