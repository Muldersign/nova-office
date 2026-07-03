create extension if not exists "pgcrypto";

create type public.company_role as enum ('Eigenaar', 'Beheerder', 'Financieel medewerker', 'Lezer');
create type public.member_status as enum ('Actief', 'Uitgenodigd');
create type public.document_status as enum ('Concept', 'Verzonden', 'Betaald', 'Verlopen', 'Geaccepteerd', 'Afgewezen');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kvk_number text not null default '',
  vat_number text not null default '',
  address text not null default '',
  postal_code text not null default '',
  city text not null default '',
  phone text not null default '',
  email text not null default '',
  iban text not null default '',
  bic text not null default '',
  logo_url text not null default '',
  plan text not null default 'Brenqo Start',
  created_at timestamptz not null default now()
);

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.company_role not null default 'Eigenaar',
  status public.member_status not null default 'Actief',
  created_at timestamptz not null default now(),
  unique(user_id, company_id)
);

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  default_vat_rate numeric not null default 21,
  payment_term_days integer not null default 14,
  invoice_prefix text not null default '2026',
  quote_prefix text not null default 'OFF-2026',
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text not null,
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  postal_code text not null default '',
  city text not null default '',
  vat_number text not null default '',
  chamber_number text not null default '',
  revenue numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text not null default '',
  unit_price numeric not null default 0,
  vat_rate numeric not null default 21,
  category text not null default 'Dienst',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  number text not null,
  status text not null default 'Concept',
  invoice_date date not null default current_date,
  due_date date not null default current_date + 14,
  subtotal numeric not null default 0,
  vat_total numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  vat_rate numeric not null default 21
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  number text not null,
  status text not null default 'Concept',
  valid_until date not null default current_date + 21,
  subtotal numeric not null default 0,
  vat_total numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, number)
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  vat_rate numeric not null default 21
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  created_at timestamptz not null default now()
);

create index idx_company_memberships_user_id on public.company_memberships(user_id);
create index idx_company_memberships_company_id on public.company_memberships(company_id);
create index idx_customers_company_id on public.customers(company_id);
create index idx_products_company_id on public.products(company_id);
create index idx_invoices_company_id on public.invoices(company_id);
create index idx_invoice_items_company_id on public.invoice_items(company_id);
create index idx_quotes_company_id on public.quotes(company_id);
create index idx_quote_items_company_id on public.quote_items(company_id);
create index idx_audit_events_company_id on public.audit_events(company_id);

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships
    where company_id = target_company_id
      and user_id = auth.uid()
      and status = 'Actief'
  );
$$;

create or replace function public.has_company_role(target_company_id uuid, allowed_roles public.company_role[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships
    where company_id = target_company_id
      and user_id = auth.uid()
      and status = 'Actief'
      and role = any(allowed_roles)
  );
$$;

create or replace function public.bootstrap_workspace(profile_name text, company_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  new_company_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select email into current_email from auth.users where id = current_user_id;

  insert into public.profiles (id, name, email)
  values (current_user_id, coalesce(nullif(profile_name, ''), current_email), current_email)
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email;

  select company_id into new_company_id
  from public.company_memberships
  where user_id = current_user_id
  order by created_at
  limit 1;

  if new_company_id is not null then
    return new_company_id;
  end if;

  insert into public.companies (name, email)
  values (coalesce(nullif(company_name, ''), 'Mijn bedrijf'), current_email)
  returning id into new_company_id;

  insert into public.company_memberships (user_id, company_id, role, status)
  values (current_user_id, new_company_id, 'Eigenaar', 'Actief');

  insert into public.company_settings (company_id)
  values (new_company_id);

  return new_company_id;
end;
$$;

grant execute on function public.bootstrap_workspace(text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.company_settings enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles are self readable" on public.profiles for select using (id = auth.uid());
create policy "profiles are self writable" on public.profiles for insert with check (id = auth.uid());
create policy "profiles are self updatable" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members read companies" on public.companies for select using (public.is_company_member(id));
create policy "owners create companies" on public.companies for insert with check (auth.uid() is not null);
create policy "admins update companies" on public.companies for update using (public.has_company_role(id, array['Eigenaar','Beheerder']::public.company_role[]));

create policy "members read memberships" on public.company_memberships for select using (public.is_company_member(company_id));
create policy "owners manage memberships" on public.company_memberships for all using (public.has_company_role(company_id, array['Eigenaar','Beheerder']::public.company_role[])) with check (public.has_company_role(company_id, array['Eigenaar','Beheerder']::public.company_role[]));

create policy "members read settings" on public.company_settings for select using (public.is_company_member(company_id));
create policy "admins manage settings" on public.company_settings for all using (public.has_company_role(company_id, array['Eigenaar','Beheerder']::public.company_role[])) with check (public.has_company_role(company_id, array['Eigenaar','Beheerder']::public.company_role[]));

create policy "members read customers" on public.customers for select using (public.is_company_member(company_id));
create policy "editors manage customers" on public.customers for all using (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[])) with check (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[]));

create policy "members read products" on public.products for select using (public.is_company_member(company_id));
create policy "editors manage products" on public.products for all using (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[])) with check (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[]));

create policy "members read invoices" on public.invoices for select using (public.is_company_member(company_id));
create policy "editors manage invoices" on public.invoices for all using (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[])) with check (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[]));

create policy "members read invoice items" on public.invoice_items for select using (public.is_company_member(company_id));
create policy "editors manage invoice items" on public.invoice_items for all using (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[])) with check (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[]));

create policy "members read quotes" on public.quotes for select using (public.is_company_member(company_id));
create policy "editors manage quotes" on public.quotes for all using (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[])) with check (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[]));

create policy "members read quote items" on public.quote_items for select using (public.is_company_member(company_id));
create policy "editors manage quote items" on public.quote_items for all using (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[])) with check (public.has_company_role(company_id, array['Eigenaar','Beheerder','Financieel medewerker']::public.company_role[]));

create policy "members read audit events" on public.audit_events for select using (public.is_company_member(company_id));
create policy "members create audit events" on public.audit_events for insert with check (public.is_company_member(company_id) and user_id = auth.uid());
