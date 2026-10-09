-- Le Chatbot Ardennais — schéma initial.
-- À appliquer sur un projet Supabase en région EU (voir README).
-- Principe : RLS activée partout, l'utilisateur lit ses propres lignes,
-- toutes les écritures passent par le service role depuis les fonctions Netlify.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.plan_type as enum ('trial', 'pro', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tone_type as enum ('tutoiement', 'vouvoiement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_role as enum ('user', 'assistant');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles : une ligne par compte, créée par trigger à l'inscription
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan public.plan_type not null default 'trial',
  stripe_customer_id text unique,
  stripe_subscription_status text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_plan_idx on public.profiles (plan);
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- business_profiles : la fiche entreprise injectée dans chaque prompt
-- ---------------------------------------------------------------------------
create table if not exists public.business_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  nom_entreprise text not null default '',
  metier text not null default '',
  ville text not null default '',
  zone_intervention text not null default '',
  horaires text not null default '',
  tarifs_indicatifs text not null default '',
  ton public.tone_type not null default 'vouvoiement',
  signature text not null default '',
  infos_libres text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- conversations et messages
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_key text not null default 'libre',
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role public.message_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- usage_events : un enregistrement par appel à l'API Anthropic.
-- user_id et conversation_id sont nullables : à la suppression d'un compte
-- les événements sont conservés anonymisés (on delete set null).
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  cache_creation_input_tokens integer not null default 0,
  cache_read_input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 8) not null default 0,
  plan_at_time public.plan_type not null,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);
create index if not exists usage_events_created_plan_idx
  on public.usage_events (created_at, plan_at_time);

-- ---------------------------------------------------------------------------
-- waitlist : emails à prévenir quand l'abonnement ouvre (sans Stripe)
-- ---------------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (email)
);

-- ---------------------------------------------------------------------------
-- Trigger : création du profil à l'inscription
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  insert into public.business_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Synchronise l'email si l'utilisateur le change.
create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_update();

-- updated_at automatique
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_touch on public.conversations;
create trigger conversations_touch
  before update on public.conversations
  for each row execute function public.touch_updated_at();

drop trigger if exists business_profiles_touch on public.business_profiles;
create trigger business_profiles_touch
  before update on public.business_profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Fonctions de coût. Le mois est le mois calendaire UTC.
-- ---------------------------------------------------------------------------
create or replace function public.utc_month_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('month', now() at time zone 'utc') at time zone 'utc';
$$;

-- Coût d'un utilisateur : à vie et mois courant.
create or replace function public.user_costs(p_user_id uuid)
returns table (lifetime_usd numeric, month_usd numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(cost_usd), 0)::numeric as lifetime_usd,
    coalesce(sum(cost_usd) filter (where created_at >= public.utc_month_start()), 0)::numeric as month_usd
  from public.usage_events
  where user_id = p_user_id;
$$;

-- Coût du mois courant par plan (trial / pro / blocked).
create or replace function public.month_costs_by_plan()
returns table (plan public.plan_type, cost_usd numeric, events bigint)
language sql
stable
security definer
set search_path = public
as $$
  select plan_at_time as plan, coalesce(sum(cost_usd), 0)::numeric, count(*)
  from public.usage_events
  where created_at >= public.utc_month_start()
  group by plan_at_time;
$$;

create or replace function public.trial_month_cost()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost_usd), 0)::numeric
  from public.usage_events
  where plan_at_time = 'trial' and created_at >= public.utc_month_start();
$$;

create or replace function public.pro_month_cost()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost_usd), 0)::numeric
  from public.usage_events
  where plan_at_time = 'pro' and created_at >= public.utc_month_start();
$$;

-- Vue d'ensemble par utilisateur (pour l'admin).
create or replace view public.user_cost_overview as
select
  p.id as user_id,
  p.email,
  p.plan,
  p.created_at,
  coalesce(sum(u.cost_usd), 0)::numeric as lifetime_usd,
  coalesce(sum(u.cost_usd) filter (where u.created_at >= public.utc_month_start()), 0)::numeric as month_usd,
  count(u.id) as events
from public.profiles p
left join public.usage_events u on u.user_id = p.id
group by p.id, p.email, p.plan, p.created_at;

-- Nombre de comptes par plan.
create or replace function public.accounts_by_plan()
returns table (plan public.plan_type, accounts bigint)
language sql
stable
security definer
set search_path = public
as $$
  select plan, count(*) from public.profiles group by plan;
$$;

-- ---------------------------------------------------------------------------
-- Suppression de compte : efface conversations, messages, fiche, profil
-- et l'utilisateur auth ; les usage_events restent, anonymisés (set null).
-- Appelée par la fonction Netlify avec le service role.
-- ---------------------------------------------------------------------------
create or replace function public.delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usage_events set user_id = null, conversation_id = null where user_id = p_user_id;
  delete from public.waitlist where user_id = p_user_id;
  delete from public.conversations where user_id = p_user_id; -- cascade messages
  delete from public.business_profiles where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS : lecture de ses propres lignes, aucune écriture côté client.
-- Le service role contourne la RLS, c'est lui qui écrit.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.business_profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.usage_events enable row level security;
alter table public.waitlist enable row level security;

drop policy if exists "profiles: own read" on public.profiles;
create policy "profiles: own read" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "business_profiles: own read" on public.business_profiles;
create policy "business_profiles: own read" on public.business_profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "conversations: own read" on public.conversations;
create policy "conversations: own read" on public.conversations
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "messages: own read" on public.messages;
create policy "messages: own read" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "usage_events: own read" on public.usage_events;
create policy "usage_events: own read" on public.usage_events
  for select to authenticated using (user_id = auth.uid());

-- waitlist : aucune lecture côté client.

-- Les fonctions de coût ne sont appelables que par le service role.
revoke execute on function public.user_costs(uuid) from public, anon, authenticated;
revoke execute on function public.month_costs_by_plan() from public, anon, authenticated;
revoke execute on function public.trial_month_cost() from public, anon, authenticated;
revoke execute on function public.pro_month_cost() from public, anon, authenticated;
revoke execute on function public.accounts_by_plan() from public, anon, authenticated;
revoke execute on function public.delete_account(uuid) from public, anon, authenticated;
revoke all on public.user_cost_overview from anon, authenticated;
