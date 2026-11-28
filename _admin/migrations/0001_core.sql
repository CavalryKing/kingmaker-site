-- KingMaker Admin core schema.
-- Times are ISO 8601 UTC strings; calendar dates are YYYY-MM-DD; money is integer cents.

-- Key/value JSON: company, bank, terms, catalogue, discounts.
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Document numbering. prefix = 'KM-INV' etc; next = the number the next document gets.
CREATE TABLE counters (
  prefix TEXT PRIMARY KEY,
  next   INTEGER NOT NULL DEFAULT 1 CHECK (next >= 1)
);

CREATE TABLE clients (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  business   TEXT NOT NULL DEFAULT '',
  stage      TEXT NOT NULL DEFAULT 'lead'
             CHECK (stage IN ('lead','audit','meeting','proposal','signed','building','done','lost')),
  data       TEXT NOT NULL DEFAULT '{}',   -- JSON: contact, website, socials, source, package, value, founding, ...
  version    INTEGER NOT NULL DEFAULT 1,   -- bumped on every save; stale saves are refused
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Dated log on each client record.
CREATE TABLE activity (
  id         TEXT PRIMARY KEY,
  client_id  TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  on_date    TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_activity_client ON activity (client_id, on_date);

-- All 8 sales-kit documents. The page content is JSON in data; the columns are what lists and
-- the dashboard need (numbers, money, dates) so they never have to parse data.
CREATE TABLE documents (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL
               CHECK (type IN ('audit','proposal','quote','agreement','onboarding','invoice','handover','consent')),
  number       TEXT NOT NULL UNIQUE,
  client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','sent','accepted','paid','void')),
  issued_on    TEXT,                       -- YYYY-MM-DD
  amount_cents INTEGER NOT NULL DEFAULT 0, -- invoice/quote: amount due; proposal: final price
  paid_cents   INTEGER NOT NULL DEFAULT 0,
  paid_on      TEXT,                       -- YYYY-MM-DD
  data         TEXT NOT NULL DEFAULT '{}',
  version      INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_documents_client ON documents (client_id);
CREATE INDEX idx_documents_type_issued ON documents (type, issued_on);
CREATE INDEX idx_documents_updated ON documents (updated_at);

INSERT INTO counters (prefix, next) VALUES
  ('KM-A', 1), ('KM-P', 1), ('KM-Q', 1), ('KM-SA', 1),
  ('KM-OQ', 1), ('KM-INV', 1), ('KM-HO', 1), ('KM-TC', 1);
