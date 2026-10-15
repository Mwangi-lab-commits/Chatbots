-- Chatbot NLP Error Monitoring and Feedback System
-- Database schema for Supabase (PostgreSQL).
--
-- How to use this file:
-- 1. Open the Supabase dashboard.
-- 2. Select "SQL Editor".
-- 3. Paste this file and click "Run".
--
-- Note: staff login is handled by Clerk. The ERD "User" table is therefore
-- not created. The columns generated_by_id, assigned_to_id, generated_by_name
-- and assigned_to_name store the Clerk user ID and the display name.

create extension if not exists pgcrypto;

-- Anonymous customer sessions. No personal data is stored.
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  anon_code text unique not null,
  created_at timestamptz not null default now()
);

-- One chat session per conversation.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  status text not null default 'Active' check (status in ('Active', 'Closed')),
  start_time timestamptz not null default now(),
  end_time timestamptz
);

-- Every customer message and every chatbot reply.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender text not null check (sender in ('Customer', 'Bot')),
  content text not null,
  sent_at timestamptz not null default now()
);

-- NLP errors detected on chatbot messages.
create table if not exists error_flags (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages (id) on delete cascade,
  error_type text not null check (error_type in ('Irrelevant', 'Repetitive', 'Misinterpreted')),
  confidence_score numeric(3, 2) not null check (confidence_score >= 0 and confidence_score <= 1),
  detected_at timestamptz not null default now()
);

-- Customer ratings and comments for chatbot messages.
-- A message receives at most one rating entry.
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references messages (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 255),
  submitted_at timestamptz not null default now()
);

-- Escalation tickets raised by customers.
create table if not exists escalations (
  id uuid primary key default gen_random_uuid(),
  ticket_code text unique not null,
  conversation_id uuid not null references conversations (id) on delete cascade,
  assigned_to_id text,
  assigned_to_name text,
  reason text not null check (reason in ('Irrelevant response', 'Repeated answers', 'Misunderstood question', 'Other')),
  description text,
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Resolved')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Report generation history.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  generated_by_id text not null,
  generated_by_name text not null,
  report_type text not null check (report_type in ('NLP error summary', 'Customer satisfaction', 'Escalation report', 'Chatbot performance')),
  date_from date not null,
  date_to date not null,
  generated_at timestamptz not null default now()
);

create index if not exists idx_conversations_customer on conversations (customer_id);
create index if not exists idx_messages_conversation on messages (conversation_id);
create index if not exists idx_messages_sent_at on messages (sent_at);
create index if not exists idx_error_flags_message on error_flags (message_id);
create index if not exists idx_error_flags_detected_at on error_flags (detected_at);
create index if not exists idx_escalations_conversation on escalations (conversation_id);
create index if not exists idx_escalations_status on escalations (status);

-- Security model:
-- All access goes through the Next.js server. The server uses the
-- service_role key. The service_role key bypasses Row Level Security.
-- RLS is enabled with no policies, so the public anon key cannot read or
-- write any table. Keep the service_role key on the server only.
alter table customers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table error_flags enable row level security;
alter table feedback enable row level security;
alter table escalations enable row level security;
alter table reports enable row level security;
