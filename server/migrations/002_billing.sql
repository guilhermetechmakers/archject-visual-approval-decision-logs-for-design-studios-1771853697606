-- Billing & subscription tables for Archject

CREATE TABLE IF NOT EXISTS studios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  billing_contact_id TEXT,
  default_currency TEXT DEFAULT 'USD',
  branding_logo_url TEXT,
  branding_invoice_accent_color TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS billing_contacts (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_city TEXT,
  address_state TEXT,
  address_postal_code TEXT,
  address_country TEXT,
  tax_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id),
  provider_subscription_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'free',
  seats INTEGER NOT NULL DEFAULT 2,
  seats_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'unpaid')),
  price_per_seat_cents INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  next_billing_date TEXT,
  trial_ends_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id),
  provider_invoice_id TEXT,
  invoice_number TEXT NOT NULL,
  amount_due_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'failed')),
  pdf_url TEXT,
  issued_at TEXT NOT NULL,
  due_at TEXT,
  line_items TEXT,
  raw_provider_payload TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id),
  provider_payment_method_id TEXT NOT NULL,
  brand TEXT NOT NULL,
  last4 TEXT NOT NULL,
  exp_month INTEGER NOT NULL,
  exp_year INTEGER NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS promos (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  studio_id TEXT,
  amount_cents INTEGER,
  percent_off INTEGER,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  applied_to_invoice_ids TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  provider_event_id TEXT NOT NULL,
  studio_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT,
  received_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_studio ON subscriptions(studio_id);
CREATE INDEX IF NOT EXISTS idx_invoices_studio ON invoices(studio_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_studio ON payment_methods(studio_id);
CREATE INDEX IF NOT EXISTS idx_billing_contacts_studio ON billing_contacts(studio_id);

-- Insert default studio (run after tables exist)
