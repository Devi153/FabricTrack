-- Additive migration: no admin tables, auth settings or existing schemas are modified.
-- Run via a privileged Supabase/Postgres migration connection.
begin;
create schema if not exists business_portal;
create table if not exists business_portal.owners (
 id uuid primary key,
 phone text not null unique,
 owner_name text not null default '',
 business_name text not null default '',
 email text not null default '',
 city text not null default '',
 onboarding_complete boolean not null default false,
 plan text not null default 'FREE' check(plan in ('FREE','STARTER','BUSINESS')),
 created_at timestamptz not null default now()
);
create table if not exists business_portal.otp_challenges (
 id uuid primary key,
 phone text not null unique,
 digest text not null,
 created_at timestamptz not null,
 expires_at timestamptz not null,
 attempts integer not null default 0 check(attempts between 0 and 5),
 consumed boolean not null default false
);
create table if not exists business_portal.sessions (
 token_digest text primary key,
 owner_id uuid not null references business_portal.owners(id) on delete cascade,
 expires_at timestamptz not null
);
create index if not exists sessions_owner_id_idx on business_portal.sessions(owner_id);
create table if not exists business_portal.delivery_limits (
 bucket text not null,
 window_start timestamptz not null,
 request_count integer not null check(request_count>=0),
 primary key(bucket,window_start)
);
create table if not exists business_portal.fabrics (
 id uuid primary key,
 owner_id uuid not null references business_portal.owners(id) on delete cascade,
 name text not null,
 type text not null,
 color text not null,
 gsm integer not null check(gsm>0),
 width_inches numeric(4,1) not null check(width_inches>0),
 quantity_meters numeric(12,1) not null check(quantity_meters>=0),
 cost_per_meter numeric(12,2) not null check(cost_per_meter>=0),
 location text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists fabrics_owner_created_idx on business_portal.fabrics(owner_id,created_at);
-- Defense in depth: do not expose this server-only schema through PostgREST.
alter table business_portal.owners enable row level security;
alter table business_portal.otp_challenges enable row level security;
alter table business_portal.sessions enable row level security;
alter table business_portal.delivery_limits enable row level security;
alter table business_portal.fabrics enable row level security;
revoke all on schema business_portal from public;
revoke all on all tables in schema business_portal from public;
-- Supabase roles are optional on plain Postgres.
do $$ begin
 if exists(select 1 from pg_roles where rolname='anon') then
  execute 'revoke all on schema business_portal from anon';
  execute 'revoke all on all tables in schema business_portal from anon';
 end if;
 if exists(select 1 from pg_roles where rolname='authenticated') then
  execute 'revoke all on schema business_portal from authenticated';
  execute 'revoke all on all tables in schema business_portal from authenticated';
 end if;
end $$;
commit;
-- Execute as a trusted backend role/table owner (or a narrowly provisioned BYPASSRLS
-- role). A normal role with RLS enabled and no policy cannot read/write these tables.
-- No browser anon/service key is used by this module.
-- Schedule cleanup of expired sessions/challenges and delivery rows older than 1 day.
