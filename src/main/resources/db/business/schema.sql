CREATE SCHEMA IF NOT EXISTS business_private;
REVOKE ALL ON SCHEMA business_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS business_private.accounts (
 id uuid PRIMARY KEY, phone text NOT NULL UNIQUE, display_name text NOT NULL,
 plan text NOT NULL DEFAULT 'FREE' CHECK(plan IN ('FREE','STANDARD')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS business_private.challenges (
 id uuid PRIMARY KEY, phone text NOT NULL UNIQUE, display_name text NOT NULL,
 code_hash text NOT NULL, attempts integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS business_private.sessions (
 token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES business_private.accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS business_private.send_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, phone text NOT NULL,
 ip_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_send_time ON business_private.send_events(created_at);
CREATE INDEX IF NOT EXISTS business_session_account ON business_private.sessions(account_id);
ALTER TABLE business_private.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_private.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_private.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_private.send_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA business_private FROM PUBLIC, anon, authenticated;
