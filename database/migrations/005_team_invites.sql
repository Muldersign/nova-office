create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invitee_name text not null default '',
  invitee_email text not null,
  role public.company_role not null default 'Lezer',
  token text not null unique,
  status text not null default 'Open',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_invitations_company_id on public.team_invitations(company_id);
create index if not exists idx_team_invitations_token on public.team_invitations(token);

alter table public.team_invitations enable row level security;

drop policy if exists "members read team invitations" on public.team_invitations;
drop policy if exists "managers create team invitations" on public.team_invitations;
drop policy if exists "managers update team invitations" on public.team_invitations;

create policy "members read team invitations"
  on public.team_invitations for select
  using (public.is_company_member(company_id));

create policy "managers create team invitations"
  on public.team_invitations for insert
  with check (public.has_company_role(company_id, array['Eigenaar','Beheerder']::public.company_role[]));

create policy "managers update team invitations"
  on public.team_invitations for update
  using (public.has_company_role(company_id, array['Eigenaar','Beheerder']::public.company_role[]))
  with check (public.has_company_role(company_id, array['Eigenaar','Beheerder']::public.company_role[]));

create or replace function public.create_company_invite(
  target_company_id uuid,
  invitee_name text,
  invitee_email text,
  invite_role public.company_role,
  invite_token text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_company_role(target_company_id, array['Eigenaar','Beheerder']::public.company_role[]) then
    raise exception 'Insufficient permissions';
  end if;

  insert into public.team_invitations (company_id, invited_by, invitee_name, invitee_email, role, token)
  values (target_company_id, current_user_id, coalesce(invitee_name, ''), lower(invitee_email), invite_role, invite_token)
  on conflict (token) do update
    set invitee_name = excluded.invitee_name,
        invitee_email = excluded.invitee_email,
        role = excluded.role,
        status = 'Open',
        accepted_at = null;

  return invite_token;
end;
$$;

create or replace function public.accept_company_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  invite_record public.team_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select lower(email) into current_email from auth.users where id = current_user_id;

  select *
    into invite_record
  from public.team_invitations
  where token = invite_token
    and status = 'Open'
  limit 1;

  if invite_record.id is null then
    raise exception 'Invitation not found';
  end if;

  if lower(invite_record.invitee_email) <> current_email then
    raise exception 'Invitation belongs to another email address';
  end if;

  insert into public.profiles (id, name, email)
  values (current_user_id, coalesce(nullif(invite_record.invitee_name, ''), current_email), current_email)
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email;

  insert into public.company_memberships (user_id, company_id, role, status)
  values (current_user_id, invite_record.company_id, invite_record.role, 'Actief')
  on conflict (user_id, company_id) do update
    set role = excluded.role,
        status = 'Actief';

  update public.team_invitations
    set status = 'Geaccepteerd',
        accepted_at = now()
  where id = invite_record.id;

  return invite_record.company_id;
end;
$$;

grant execute on function public.create_company_invite(uuid, text, text, public.company_role, text) to authenticated;
grant execute on function public.accept_company_invite(text) to authenticated;
