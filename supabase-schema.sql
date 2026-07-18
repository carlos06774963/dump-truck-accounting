-- Run this in Supabase SQL Editor

create table customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text default '',
  city_state_zip text default '',
  phone text default '',
  created_at timestamptz default now()
);

create table bills_of_lading (
  id uuid default gen_random_uuid() primary key,
  bill_no text default '',
  date text default '',
  principal_carrier_name text default '',
  underlying_carrier text default '',
  underlying_address text default '',
  underlying_phone text default '',
  job_no text default '',
  broker_no text default '',
  truck_no text default '',
  trailer_no text default '',
  ca_no text default '',
  shipper text default '',
  shipper_address text default '',
  shipper_city_state_zip text default '',
  receiver text default '',
  receiver_address text default '',
  receiver_city_state_zip text default '',
  point_of_origin text default '',
  point_of_destination text default '',
  equipment_type text default '',
  billing_method text default 'PER LOAD',
  rate numeric default 0,
  reporting_time text default '',
  ending_time text default '',
  total_time text default '',
  deductible_time text default '',
  net_time text default '',
  total_tons text default '',
  accessorial_other numeric default 0,
  total_charges numeric default 0,
  notes text default '',
  status text default 'draft',
  created_at timestamptz default now()
);

create table bol_loads (
  id uuid default gen_random_uuid() primary key,
  bol_id uuid references bills_of_lading(id),
  row_number integer default 1,
  tag_no text default '',
  weight text default '',
  commodity text default '',
  loading_arrive text default '',
  loading_depart text default '',
  unloading_arrive text default '',
  unloading_depart text default '',
  standby_time text default '',
  breakdown_reason text default ''
);

create table expenses (
  id uuid default gen_random_uuid() primary key,
  date text not null,
  category text default '',
  description text default '',
  amount numeric default 0,
  truck_no text default '',
  created_at timestamptz default now()
);

-- Allow public access (no login required for now)
alter table customers enable row level security;
alter table bills_of_lading enable row level security;
alter table bol_loads enable row level security;
alter table expenses enable row level security;

create policy "allow all" on customers for all using (true) with check (true);
create policy "allow all" on bills_of_lading for all using (true) with check (true);
create policy "allow all" on bol_loads for all using (true) with check (true);
create policy "allow all" on expenses for all using (true) with check (true);
