alter table public.companies
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.save_company_workspace(
  target_company_id uuid,
  company_name text,
  kvk_number text,
  vat_number text,
  company_address text,
  company_postal_code text,
  company_city text,
  company_phone text,
  company_email text,
  company_iban text,
  company_bic text,
  company_logo_url text,
  company_plan text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_company_id uuid := coalesce(target_company_id, gen_random_uuid());
  company_exists boolean;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select exists(select 1 from public.companies where id = saved_company_id)
    into company_exists;

  if company_exists and not public.has_company_role(saved_company_id, array['Eigenaar','Beheerder']::public.company_role[]) then
    raise exception 'Insufficient permissions';
  end if;

  insert into public.companies (
    id,
    name,
    kvk_number,
    vat_number,
    address,
    postal_code,
    city,
    phone,
    email,
    iban,
    bic,
    logo_url,
    plan
  )
  values (
    saved_company_id,
    coalesce(nullif(company_name, ''), 'Mijn bedrijf'),
    kvk_number,
    vat_number,
    company_address,
    company_postal_code,
    company_city,
    company_phone,
    company_email,
    company_iban,
    company_bic,
    company_logo_url,
    coalesce(nullif(company_plan, ''), 'Brenqo Start')
  )
  on conflict (id) do update
    set name = excluded.name,
        kvk_number = excluded.kvk_number,
        vat_number = excluded.vat_number,
        address = excluded.address,
        postal_code = excluded.postal_code,
        city = excluded.city,
        phone = excluded.phone,
        email = excluded.email,
        iban = excluded.iban,
        bic = excluded.bic,
        logo_url = excluded.logo_url,
        plan = excluded.plan,
        updated_at = now();

  insert into public.company_memberships (user_id, company_id, role, status)
  values (current_user_id, saved_company_id, 'Eigenaar', 'Actief')
  on conflict (user_id, company_id) do nothing;

  insert into public.company_settings (company_id)
  values (saved_company_id)
  on conflict (company_id) do nothing;

  return saved_company_id;
end;
$$;

grant execute on function public.save_company_workspace(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
