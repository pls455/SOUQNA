-- Souq Gaza (سوقنا) — Production PostgreSQL & Supabase Auth Schema
-- Run this SQL inside the Supabase SQL Editor to provision tables, indexes, and RLS policies.

create extension if not exists "pgcrypto";

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'buyer' check (role in ('buyer', 'merchant', 'admin')),
  region text not null default 'مدينة غزة',
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now()
);

-- 2. Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon_name text not null default 'Tag',
  product_count integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Stores
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  username text not null unique,
  owner_name text not null,
  email text not null,
  phone text not null,
  whatsapp text not null,
  region text not null,
  description text not null default '',
  cover_image_url text not null default '',
  logo_text text not null default 'م',
  verified boolean not null default false,
  featured boolean not null default false,
  status text not null default 'approved' check (status in ('approved', 'suspended', 'archived')),
  rating numeric(2,1) not null default 5.0,
  review_count integer not null default 0,
  working_hours text not null default '',
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  plan_start_date date not null default current_date,
  plan_end_date date not null default (current_date + interval '30 days'),
  delivery_fees jsonb not null default '{}'::jsonb,
  policies text not null default '',
  order_notifications_enabled boolean not null default true,
  views integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. Products (image URLs stored on Cloudflare R2 CDN)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2),
  images text[] not null default '{}',
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  available boolean not null default true,
  archived boolean not null default false,
  views integer not null default 0,
  rating numeric(2,1) not null default 5.0,
  review_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_store on public.products(store_id);
create index if not exists idx_products_category on public.products(category_id);

-- 5. Product Reviews
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  author text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

-- 6. Orders & Order Items
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  store_id uuid not null references public.stores(id) on delete restrict,
  buyer_id uuid references public.profiles(id) on delete set null,
  store_name text not null,
  customer_name text not null,
  customer_phone text not null,
  region text not null,
  address text not null,
  notes text,
  channel text not null default 'platform' check (channel in ('platform', 'whatsapp')),
  is_guest boolean not null default true,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2),
  total numeric(10,2) not null,
  status text not null default 'new' check (status in ('new', 'accepted', 'preparing', 'out_for_delivery', 'completed', 'rejected', 'cancelled')),
  internal_note text,
  timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_store on public.orders(store_id);

-- 7. Store Onboarding Applications
create table if not exists public.store_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references public.profiles(id) on delete set null,
  store_name text not null,
  username text not null,
  owner_name text not null,
  email text not null,
  phone text not null,
  whatsapp text not null,
  region text not null,
  description text not null default '',
  proof_document_url text not null default '',
  proof_document_name text not null default '',
  proof_summary text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_info')),
  rejection_reason text,
  info_request_note text,
  submitted_at timestamptz not null default now()
);

-- 8. Store Staff Members
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  role text not null,
  permissions jsonb not null default '{"manageProducts":false,"manageOrders":true,"viewAnalytics":false}'::jsonb,
  active boolean not null default true,
  last_activity text not null default '',
  created_at timestamptz not null default now()
);

-- 9. Daily Store Analytics (for Weekly & Monthly Recharts)
create table if not exists public.store_analytics_daily (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  metric_date date not null,
  visits integer not null default 0,
  product_views integer not null default 0,
  orders_count integer not null default 0,
  sales_amount numeric(10,2) not null default 0,
  unique (store_id, metric_date)
);

-- 10. Subscription Plans, Payments, Coupons, Moderation & Audit Log
create table if not exists public.subscription_plans (
  id text primary key check (id in ('free', 'pro', 'business')),
  name text not null,
  subtitle text not null,
  monthly_price numeric(10,2) not null default 0,
  max_products integer not null default 50,
  features text[] not null default '{}'
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  store_name text not null,
  type text not null check (type in ('subscription', 'service')),
  description text not null,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  currency text not null default 'ILS',
  external_payment_id text unique,
  checkout_url text,
  paid_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  event_key text not null unique,
  event_type text not null,
  payload_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  payment_id uuid references public.payments(id) on delete set null,
  signature_valid boolean not null default false,
  payload_hash text not null,
  received_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent integer not null check (discount_percent between 1 and 90),
  scope text not null,
  usage_count integer not null default 0,
  max_usage integer not null default 100,
  active boolean not null default true,
  expires_at date not null
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('product', 'store')),
  target_id uuid not null,
  target_name text not null,
  reason text not null,
  reporter_label text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_complaints (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  store_name text not null,
  customer_name text not null,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target text not null,
  details text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'danger')),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  id integer primary key default 1 check (id = 1),
  platform_name text not null default 'سوقنا',
  supported_regions text[] not null default array['مدينة غزة','شمال غزة','المحافظة الوسطى','خانيونس','رفح'],
  username_min_length integer not null default 3,
  guest_checkout_enabled boolean not null default true,
  maintenance_mode boolean not null default false,
  support_whatsapp text not null default '',
  buyer_terms_summary text not null default ''
);

-- Enable Row-Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.product_reviews enable row level security;
alter table public.orders enable row level security;
alter table public.store_applications enable row level security;
alter table public.staff_members enable row level security;
alter table public.store_analytics_daily enable row level security;
alter table public.platform_settings enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_webhook_events enable row level security;

-- Public read access for active storefront entities
create policy "Public read active categories" on public.categories
  for select using (active = true);

create policy "Public read approved stores" on public.stores
  for select using (status = 'approved' or owner_id = auth.uid());

create policy "Public read active products" on public.products
  for select using (
    archived = false
    and exists (select 1 from public.stores s where s.id = store_id and s.status = 'approved')
  );

create policy "Public read reviews" on public.product_reviews
  for select using (true);

create policy "Public read platform settings" on public.platform_settings
  for select using (true);

-- Authenticated user & store owner policies
create policy "Users read own profile" on public.profiles
  for select using (id = auth.uid());

create policy "Users update own profile" on public.profiles
  for update using (id = auth.uid());

create policy "Merchants manage own store" on public.stores
  for all using (owner_id = auth.uid());

create policy "Merchants manage own products" on public.products
  for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

create policy "Anyone can place order" on public.orders
  for insert with check (true);

create policy "Buyers and store owners read relevant orders" on public.orders
  for select using (
    buyer_id = auth.uid()
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

create policy "Merchants update own store orders" on public.orders
  for update using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );
