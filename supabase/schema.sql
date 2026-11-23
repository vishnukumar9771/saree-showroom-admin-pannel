-- AARANYA — The House of Indian Silks
-- Production-ready Supabase PostgreSQL Schema & Row Level Security (RLS) Policies

create extension if not exists "pgcrypto";

-- 1. Admin Staff & Role-Based Access Control (linked to Supabase auth.users)
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in (
    'Super Admin',
    'Atelier Manager',
    'Inventory Curator',
    'Concierge Executive',
    'Finance & Accounts',
    'Storefront Viewer'
  )),
  status text not null default 'Active' check (status in ('Active', 'Suspended')),
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- Helper function for RLS role verification
create or replace function public.is_active_admin(allowed_roles text[] default null)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.admin_users
    where id = auth.uid()
      and status = 'Active'
      and (allowed_roles is null or role = any(allowed_roles))
  );
$$;

-- 2. Categories & Collections
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  image text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.collections (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  cover_image text not null default '',
  display_order integer not null default 0,
  featured boolean not null default false,
  status text not null default 'Active' check (status in ('Active', 'Hidden')),
  created_at timestamptz not null default now()
);

-- 3. Products
create table if not exists public.products (
  id text primary key,
  name text not null,
  sku text not null unique,
  slug text not null unique,
  description text not null default '',
  category_id text references public.categories(id) on delete set null,
  collection_id text references public.collections(id) on delete set null,
  selling_price numeric(12, 2) not null,
  mrp numeric(12, 2) not null,
  discount_percent integer not null default 0,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 3,
  fabric text not null default '',
  saree_type text not null default '',
  color text not null default '',
  occasion text not null default '',
  length text not null default '',
  blouse_details text not null default '',
  care_instructions text not null default '',
  featured boolean not null default false,
  bestseller boolean not null default false,
  new_arrival boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  seo_title text not null default '',
  seo_description text not null default '',
  status text not null default 'Draft' check (status in ('Published', 'Draft', 'Archived')),
  provenance jsonb,
  sales_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Stock Movements
create table if not exists public.stock_movements (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  type text not null,
  quantity_delta integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text not null,
  notes text not null default '',
  performed_by text not null,
  created_at timestamptz not null default now()
);

-- 5. Customers & Orders
create table if not exists public.customers (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text not null default '',
  city text not null default '',
  segment text not null default 'New',
  total_spent numeric(12, 2) not null default 0,
  orders_count integer not null default 0,
  last_order_date timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null,
  items jsonb not null,
  subtotal numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  coupon_code text,
  gst_amount numeric(12, 2) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null,
  payment_method text not null,
  payment_status text not null,
  fulfillment_status text not null,
  tracking_number text,
  courier_partner text,
  cancellation_reason text,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 6. Coupons, Wishlist Analytics, Enquiries, Content, Expenses, Suppliers, POs, Settings
create table if not exists public.coupons (
  id text primary key,
  code text not null unique,
  description text not null default '',
  discount_type text not null check (discount_type in ('Percentage', 'Fixed')),
  discount_value numeric(12, 2) not null,
  min_order_value numeric(12, 2) not null default 0,
  max_discount_amount numeric(12, 2),
  usage_limit integer not null default 100,
  used_count integer not null default 0,
  per_customer_limit integer not null default 1,
  expiry_date date not null,
  active boolean not null default true
);

create table if not exists public.enquiries (
  id text primary key,
  customer_name text not null,
  phone text not null,
  email text not null,
  enquiry_type text not null,
  product_id text references public.products(id) on delete set null,
  product_name text,
  message text not null,
  priority text not null default 'Medium',
  status text not null default 'New',
  assigned_staff text not null default '',
  follow_up_date date,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  category text not null,
  vendor text not null,
  amount numeric(12, 2) not null,
  date date not null,
  payment_status text not null,
  payment_method text not null,
  notes text not null default '',
  attachment_ref text
);

create table if not exists public.suppliers (
  id text primary key,
  name text not null,
  craft_cluster text not null,
  contact_person text not null,
  phone text not null,
  email text not null,
  outstanding_balance numeric(12, 2) not null default 0,
  total_paid numeric(12, 2) not null default 0,
  notes text not null default '',
  active boolean not null default true
);

create table if not exists public.purchase_orders (
  id text primary key,
  po_number text not null unique,
  supplier_id text not null references public.suppliers(id) on delete restrict,
  items jsonb not null,
  total_amount numeric(12, 2) not null,
  paid_amount numeric(12, 2) not null default 0,
  status text not null,
  expected_date date not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id text primary key default 'primary',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id text primary key default 'primary',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Enable RLS across all tables
alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.coupons enable row level security;
alter table public.enquiries enable row level security;
alter table public.expenses enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.site_content enable row level security;
alter table public.store_settings enable row level security;

-- Public Storefront Read Policies (Published products, active collections, categories, site content)
create policy "Public read published products"
  on public.products for select
  using (status = 'Published');

create policy "Public read active collections"
  on public.collections for select
  using (status = 'Active');

create policy "Public read categories"
  on public.categories for select
  using (true);

create policy "Public read site content"
  on public.site_content for select
  using (true);

-- Admin RBAC Policies
create policy "Admin manage products"
  on public.products for all
  using (public.is_active_admin(array['Super Admin', 'Atelier Manager', 'Inventory Curator']));

create policy "Admin manage orders"
  on public.orders for all
  using (public.is_active_admin(array['Super Admin', 'Atelier Manager', 'Concierge Executive', 'Finance & Accounts']));

create policy "Admin manage expenses and suppliers"
  on public.expenses for all
  using (public.is_active_admin(array['Super Admin', 'Finance & Accounts']));

create policy "Super Admin manage staff and settings"
  on public.admin_users for all
  using (public.is_active_admin(array['Super Admin']));
