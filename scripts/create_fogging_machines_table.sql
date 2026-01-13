create table if not exists fogging_machines (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  status text default 'ACTIVE',
  created_at timestamp with time zone default now()
);

-- Insert initial data
insert into fogging_machines (code) values ('12562'), ('14163') on conflict do nothing;
