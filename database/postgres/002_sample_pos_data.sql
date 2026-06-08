-- Local development sample data for Noblesse POS analytics.
-- This is not production data.
-- Do not run this file against a production database.
-- This file is additive and avoids duplicate inserts with stable source IDs.

insert into buyers (
  source_customer_id,
  noblesse_buyer_id,
  customer_name,
  company_name,
  contact_name,
  phone,
  country,
  market,
  currency,
  discount_rate,
  vat_enabled,
  status,
  raw_customer_json
)
select
  'sample-buyer-a',
  'mock-approved-buyer',
  'Tokyo Piercing Lab',
  'Tokyo Piercing Lab',
  'Yamada Haruka',
  '+81-90-1234-5678',
  'JP',
  'JP',
  'JPY',
  12.00,
  false,
  'active',
  '{"sample": true, "segment": "repeat_buyer"}'::jsonb
where not exists (
  select 1 from buyers where source_customer_id = 'sample-buyer-a'
);

insert into buyers (
  source_customer_id,
  noblesse_buyer_id,
  customer_name,
  company_name,
  contact_name,
  phone,
  country,
  market,
  currency,
  discount_rate,
  vat_enabled,
  status,
  raw_customer_json
)
select
  'sample-buyer-b',
  null,
  'Seoul Style Studio',
  'Seoul Style Studio',
  'Kim Minji',
  '+82-10-5555-0100',
  'KR',
  'KR',
  'KRW',
  0.00,
  true,
  'active',
  '{"sample": true, "segment": "single_purchase"}'::jsonb
where not exists (
  select 1 from buyers where source_customer_id = 'sample-buyer-b'
);

insert into products (
  source_item_id,
  noblesse_product_id,
  product_code,
  item_name,
  product_name,
  category_id,
  category_name,
  unit_price,
  is_official,
  is_active,
  raw_item_json
)
select
  'sample-item-001',
  'NB-001',
  'NB-001',
  'Silver Basic Ball Barbell',
  'Silver Basic Ball Barbell',
  'barbell',
  'Barbell',
  1200,
  true,
  true,
  '{"sample": true}'::jsonb
where not exists (
  select 1 from products where source_item_id = 'sample-item-001'
);

insert into products (
  source_item_id,
  noblesse_product_id,
  product_code,
  item_name,
  product_name,
  category_id,
  category_name,
  unit_price,
  is_official,
  is_active,
  raw_item_json
)
select
  'sample-item-002',
  'NB-002',
  'NB-002',
  'Opal Heart Cubic Labret',
  'Opal Heart Cubic Labret',
  'labret',
  'Labret',
  1800,
  true,
  true,
  '{"sample": true}'::jsonb
where not exists (
  select 1 from products where source_item_id = 'sample-item-002'
);

insert into products (
  source_item_id,
  noblesse_product_id,
  product_code,
  item_name,
  product_name,
  category_id,
  category_name,
  unit_price,
  is_official,
  is_active,
  raw_item_json
)
select
  'sample-item-003',
  'NB-003',
  'NB-003',
  'Gold One-Touch Segment Ring',
  'Gold One-Touch Segment Ring',
  'ring',
  'Ring',
  2600,
  true,
  true,
  '{"sample": true}'::jsonb
where not exists (
  select 1 from products where source_item_id = 'sample-item-003'
);

with buyer_a as (
  select id from buyers where source_customer_id = 'sample-buyer-a'
)
insert into pos_sales (
  source_system,
  source_sale_id,
  local_sale_id,
  idempotency_key,
  buyer_id,
  source_customer_id,
  customer_name,
  sale_date,
  currency,
  subtotal_amount,
  discount_amount,
  supply_amount,
  vat_amount,
  total_amount,
  total_quantity,
  line_count,
  writer_name,
  app_version,
  synced_at,
  raw_sale_json
)
select
  'sample_pos',
  'sample-sale-202605-001',
  'local-202605-001',
  'sample_pos:local-202605-001',
  buyer_a.id,
  'sample-buyer-a',
  'Tokyo Piercing Lab',
  '2026-05-10T10:30:00+09:00',
  'JPY',
  72000,
  6000,
  66000,
  0,
  66000,
  45,
  2,
  'sample-admin',
  '1.0.0',
  '2026-05-10T10:35:00+09:00',
  '{"sample": true, "month": "2026-05"}'::jsonb
from buyer_a
where not exists (
  select 1 from pos_sales where source_system = 'sample_pos' and source_sale_id = 'sample-sale-202605-001'
);

with buyer_a as (
  select id from buyers where source_customer_id = 'sample-buyer-a'
)
insert into pos_sales (
  source_system,
  source_sale_id,
  local_sale_id,
  idempotency_key,
  buyer_id,
  source_customer_id,
  customer_name,
  sale_date,
  currency,
  subtotal_amount,
  discount_amount,
  supply_amount,
  vat_amount,
  total_amount,
  total_quantity,
  line_count,
  writer_name,
  app_version,
  synced_at,
  raw_sale_json
)
select
  'sample_pos',
  'sample-sale-202605-002',
  'local-202605-002',
  'sample_pos:local-202605-002',
  buyer_a.id,
  'sample-buyer-a',
  'Tokyo Piercing Lab',
  '2026-05-24T15:10:00+09:00',
  'JPY',
  54000,
  4000,
  50000,
  0,
  50000,
  30,
  2,
  'sample-admin',
  '1.0.0',
  '2026-05-24T15:15:00+09:00',
  '{"sample": true, "month": "2026-05"}'::jsonb
from buyer_a
where not exists (
  select 1 from pos_sales where source_system = 'sample_pos' and source_sale_id = 'sample-sale-202605-002'
);

with buyer_a as (
  select id from buyers where source_customer_id = 'sample-buyer-a'
)
insert into pos_sales (
  source_system,
  source_sale_id,
  local_sale_id,
  idempotency_key,
  buyer_id,
  source_customer_id,
  customer_name,
  sale_date,
  currency,
  subtotal_amount,
  discount_amount,
  supply_amount,
  vat_amount,
  total_amount,
  total_quantity,
  line_count,
  writer_name,
  app_version,
  synced_at,
  raw_sale_json
)
select
  'sample_pos',
  'sample-sale-202606-001',
  'local-202606-001',
  'sample_pos:local-202606-001',
  buyer_a.id,
  'sample-buyer-a',
  'Tokyo Piercing Lab',
  '2026-06-04T11:20:00+09:00',
  'JPY',
  98000,
  8000,
  90000,
  0,
  90000,
  55,
  3,
  'sample-admin',
  '1.1.0',
  '2026-06-04T11:25:00+09:00',
  '{"sample": true, "month": "2026-06"}'::jsonb
from buyer_a
where not exists (
  select 1 from pos_sales where source_system = 'sample_pos' and source_sale_id = 'sample-sale-202606-001'
);

with buyer_b as (
  select id from buyers where source_customer_id = 'sample-buyer-b'
)
insert into pos_sales (
  source_system,
  source_sale_id,
  local_sale_id,
  idempotency_key,
  buyer_id,
  source_customer_id,
  customer_name,
  sale_date,
  currency,
  subtotal_amount,
  discount_amount,
  supply_amount,
  vat_amount,
  total_amount,
  total_quantity,
  line_count,
  writer_name,
  app_version,
  synced_at,
  raw_sale_json
)
select
  'sample_pos',
  'sample-sale-202606-002',
  'local-202606-002',
  'sample_pos:local-202606-002',
  buyer_b.id,
  'sample-buyer-b',
  'Seoul Style Studio',
  '2026-06-05T16:40:00+09:00',
  'KRW',
  132000,
  0,
  120000,
  12000,
  132000,
  60,
  2,
  'sample-admin',
  '1.1.0',
  '2026-06-05T16:45:00+09:00',
  '{"sample": true, "month": "2026-06"}'::jsonb
from buyer_b
where not exists (
  select 1 from pos_sales where source_system = 'sample_pos' and source_sale_id = 'sample-sale-202606-002'
);

with sale_rows as (
  select id, source_sale_id from pos_sales where source_system = 'sample_pos'
),
product_rows as (
  select id, source_item_id from products where source_item_id in ('sample-item-001', 'sample-item-002', 'sample-item-003')
)
insert into pos_sale_items (
  pos_sale_id,
  source_line_id,
  source_item_id,
  product_id,
  product_code,
  item_name,
  category_id,
  category_name,
  quantity,
  unit_price,
  original_unit_price,
  line_total_amount,
  discountable,
  raw_line_json
)
select
  sale_rows.id,
  line_data.source_line_id,
  line_data.source_item_id,
  product_rows.id,
  line_data.product_code,
  line_data.item_name,
  line_data.category_id,
  line_data.category_name,
  line_data.quantity,
  line_data.unit_price,
  line_data.original_unit_price,
  line_data.line_total_amount,
  line_data.discountable,
  line_data.raw_line_json::jsonb
from (
  values
    ('sample-sale-202605-001', 'sample-line-001-01', 'sample-item-001', 'NB-001', 'Silver Basic Ball Barbell', 'barbell', 'Barbell', 30, 1200, 1200, 36000, true, '{"sample": true}'),
    ('sample-sale-202605-001', 'sample-line-001-02', 'sample-item-002', 'NB-002', 'Opal Heart Cubic Labret', 'labret', 'Labret', 15, 2400, 2400, 36000, true, '{"sample": true}'),
    ('sample-sale-202605-002', 'sample-line-002-01', 'sample-item-001', 'NB-001', 'Silver Basic Ball Barbell', 'barbell', 'Barbell', 20, 1200, 1200, 24000, true, '{"sample": true}'),
    ('sample-sale-202605-002', 'sample-line-002-02', 'sample-item-003', 'NB-003', 'Gold One-Touch Segment Ring', 'ring', 'Ring', 10, 3000, 3000, 30000, true, '{"sample": true}'),
    ('sample-sale-202606-001', 'sample-line-003-01', 'sample-item-001', 'NB-001', 'Silver Basic Ball Barbell', 'barbell', 'Barbell', 35, 1200, 1200, 42000, true, '{"sample": true}'),
    ('sample-sale-202606-001', 'sample-line-003-02', 'sample-item-002', 'NB-002', 'Opal Heart Cubic Labret', 'labret', 'Labret', 10, 2400, 2400, 24000, true, '{"sample": true}'),
    ('sample-sale-202606-001', 'sample-line-003-03', 'sample-item-003', 'NB-003', 'Gold One-Touch Segment Ring', 'ring', 'Ring', 10, 3200, 3200, 32000, true, '{"sample": true}'),
    ('sample-sale-202606-002', 'sample-line-004-01', 'sample-item-002', 'NB-002', 'Opal Heart Cubic Labret', 'labret', 'Labret', 40, 2200, 2200, 88000, true, '{"sample": true}'),
    ('sample-sale-202606-002', 'sample-line-004-02', 'sample-item-003', 'NB-003', 'Gold One-Touch Segment Ring', 'ring', 'Ring', 20, 2200, 2200, 44000, true, '{"sample": true}')
) as line_data(
  source_sale_id,
  source_line_id,
  source_item_id,
  product_code,
  item_name,
  category_id,
  category_name,
  quantity,
  unit_price,
  original_unit_price,
  line_total_amount,
  discountable,
  raw_line_json
)
join sale_rows on sale_rows.source_sale_id = line_data.source_sale_id
join product_rows on product_rows.source_item_id = line_data.source_item_id
where not exists (
  select 1
  from pos_sale_items existing
  where existing.pos_sale_id = sale_rows.id
    and existing.source_line_id = line_data.source_line_id
);
