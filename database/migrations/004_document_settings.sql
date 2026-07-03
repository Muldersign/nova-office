alter table public.company_settings
  add column if not exists payment_reference_prefix text not null default 'Factuur',
  add column if not exists document_footer text not null default 'Bedankt voor de samenwerking. Vragen? Reageer op deze factuurmail.';
