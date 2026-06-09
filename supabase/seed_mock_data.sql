-- Development-only seed data for Noblesse Piercing PostgreSQL/Supabase.
-- Do not run this file against production.

insert into public.users (auth_uid, email, role, status)
values
  ('mock_admin_001', 'admin@noblesse.example', 'admin', 'approved'),
  ('mock_buyer_tokyo_001', 'buyer-tokyo@noblesse.example', 'buyer', 'approved')
on conflict (email) do update set
  auth_uid = excluded.auth_uid,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into public.buyers (
  user_id,
  company_name,
  contact_name,
  country,
  preferred_language,
  phone,
  messenger_type,
  messenger_id,
  sales_channel,
  business_number,
  assigned_market,
  currency,
  discount_rate,
  min_order_amount,
  approved_at,
  approved_by
)
select
  buyer_user.id,
  'Tokyo Piercing Lab',
  'Haruka Yamada',
  'JP',
  'ja',
  '+81-90-0000-0000',
  'LINE',
  'tokyo-piercing-lab',
  'online_store',
  'JP-123456789',
  'JP',
  'JPY',
  12,
  30000,
  now(),
  admin_user.id
from public.users buyer_user
cross join public.users admin_user
where buyer_user.email = 'buyer-tokyo@noblesse.example'
  and admin_user.email = 'admin@noblesse.example'
on conflict (user_id) do update set
  company_name = excluded.company_name,
  assigned_market = excluded.assigned_market,
  currency = excluded.currency,
  discount_rate = excluded.discount_rate,
  min_order_amount = excluded.min_order_amount,
  approved_at = excluded.approved_at,
  approved_by = excluded.approved_by,
  updated_at = now();

insert into public.categories (category_id, name_ko, name_en, name_ja, slug, cover_url, sort_order)
values
  ('barbell', 'Barbell', 'Barbell', 'Barbell', 'barbell', 'https://cdn.example.com/categories/barbell/cover.webp', 10),
  ('labret', 'Labret', 'Labret', 'Labret', 'labret', 'https://cdn.example.com/categories/labret/cover.webp', 20),
  ('ring', 'Ring', 'Ring', 'Ring', 'ring', 'https://cdn.example.com/categories/ring/cover.webp', 30),
  ('cubic', 'Cubic', 'Cubic', 'Cubic', 'cubic', 'https://cdn.example.com/categories/cubic/cover.webp', 40),
  ('titanium', 'Titanium', 'Titanium', 'Titanium', 'titanium', 'https://cdn.example.com/categories/titanium/cover.webp', 50)
on conflict (category_id) do update set
  name_en = excluded.name_en,
  slug = excluded.slug,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.collections (collection_id, title_ko, title_en, title_ja, slug, cover_url, sort_order)
values
  ('japan-buyer-picks', 'Japan Buyer Picks', 'Japan Buyer Picks', 'Japan Buyer Picks', 'japan-buyer-picks', 'https://cdn.example.com/collections/japan-buyer-picks/cover.webp', 10),
  ('export-best-items', 'Export Best Items', 'Export Best Items', 'Export Best Items', 'export-best-items', 'https://cdn.example.com/collections/export-best-items/cover.webp', 20),
  ('new-arrivals', 'New Arrivals', 'New Arrivals', 'New Arrivals', 'new-arrivals', 'https://cdn.example.com/collections/new-arrivals/cover.webp', 30)
on conflict (collection_id) do update set
  title_en = excluded.title_en,
  slug = excluded.slug,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.products (
  code,
  name_ko,
  name_en,
  name_ja,
  category_id,
  material,
  colors,
  sizes,
  moq_default,
  lead_time,
  origin,
  image_set,
  image_alt,
  is_new,
  is_best,
  sort_order,
  description_en
)
select
  item.code,
  item.name_ko,
  item.name_en,
  item.name_ja,
  c.id,
  item.material,
  item.colors,
  item.sizes,
  item.moq_default,
  item.lead_time,
  item.origin,
  item.image_set,
  item.image_alt,
  item.is_new,
  item.is_best,
  item.sort_order,
  item.description_en
from (
  values
    ('NB-001', 'Basic Ball Barbell', 'Basic Ball Barbell', 'Basic Ball Barbell', 'barbell', 'Surgical Steel', '["Silver"]'::jsonb, '["6mm","8mm"]'::jsonb, 20, '7-14 days', 'KR', '{"thumb":"https://cdn.example.com/products/NB-001/thumb/thumb.webp","card":"https://cdn.example.com/products/NB-001/card/card.webp","detail":"https://cdn.example.com/products/NB-001/detail/detail.webp","zoom":"https://cdn.example.com/products/NB-001/zoom/zoom.webp"}'::jsonb, '{"en":"Basic ball barbell"}'::jsonb, true, true, 10, 'A clean daily piercing style for global buyers.'),
    ('NB-002', 'Titanium Flat Labret', 'Titanium Flat Labret', 'Titanium Flat Labret', 'labret', 'Titanium', '["Silver"]'::jsonb, '["6mm","8mm","10mm"]'::jsonb, 20, '10-18 days', 'KR', '{"thumb":"https://cdn.example.com/products/NB-002/thumb/thumb.webp","card":"https://cdn.example.com/products/NB-002/card/card.webp","detail":"https://cdn.example.com/products/NB-002/detail/detail.webp","zoom":"https://cdn.example.com/products/NB-002/zoom/zoom.webp"}'::jsonb, '{"en":"Titanium flat labret"}'::jsonb, true, false, 20, 'Lightweight titanium labret for curated piercing catalogs.'),
    ('NB-003', 'Cubic Segment Ring', 'Cubic Segment Ring', 'Cubic Segment Ring', 'ring', 'Cubic', '["Silver","Gold"]'::jsonb, '["8mm","10mm"]'::jsonb, 12, '7-14 days', 'KR', '{"thumb":"https://cdn.example.com/products/NB-003/thumb/thumb.webp","card":"https://cdn.example.com/products/NB-003/card/card.webp","detail":"https://cdn.example.com/products/NB-003/detail/detail.webp","zoom":"https://cdn.example.com/products/NB-003/zoom/zoom.webp"}'::jsonb, '{"en":"Cubic segment ring"}'::jsonb, false, true, 30, 'Cubic ring style for premium piercing edits.'),
    ('NB-004', 'Gold Mini Hoop', 'Gold Mini Hoop', 'Gold Mini Hoop', 'ring', '14K Gold', '["Gold"]'::jsonb, '["6mm","8mm"]'::jsonb, 10, '14-21 days', 'KR', '{"thumb":"https://cdn.example.com/products/NB-004/thumb/thumb.webp","card":"https://cdn.example.com/products/NB-004/card/card.webp","detail":"https://cdn.example.com/products/NB-004/detail/detail.webp","zoom":"https://cdn.example.com/products/NB-004/zoom/zoom.webp"}'::jsonb, '{"en":"Gold mini hoop"}'::jsonb, false, true, 40, 'A refined gold piercing style for boutique buyers.'),
    ('NB-005', 'Titanium Cubic Stud', 'Titanium Cubic Stud', 'Titanium Cubic Stud', 'titanium', 'Titanium', '["Silver"]'::jsonb, '["3mm","4mm"]'::jsonb, 20, '10-18 days', 'KR', '{"thumb":"https://cdn.example.com/products/NB-005/thumb/thumb.webp","card":"https://cdn.example.com/products/NB-005/card/card.webp","detail":"https://cdn.example.com/products/NB-005/detail/detail.webp","zoom":"https://cdn.example.com/products/NB-005/zoom/zoom.webp"}'::jsonb, '{"en":"Titanium cubic stud"}'::jsonb, true, true, 50, 'Small cubic titanium stud with a clean catalog look.')
) as item(code, name_ko, name_en, name_ja, category_slug, material, colors, sizes, moq_default, lead_time, origin, image_set, image_alt, is_new, is_best, sort_order, description_en)
join public.categories c on c.slug = item.category_slug
on conflict (code) do update set
  name_en = excluded.name_en,
  category_id = excluded.category_id,
  material = excluded.material,
  colors = excluded.colors,
  sizes = excluded.sizes,
  moq_default = excluded.moq_default,
  lead_time = excluded.lead_time,
  image_set = excluded.image_set,
  image_alt = excluded.image_alt,
  is_new = excluded.is_new,
  is_best = excluded.is_best,
  sort_order = excluded.sort_order,
  description_en = excluded.description_en,
  updated_at = now();

insert into public.product_collections (product_id, collection_id, sort_order)
select p.id, c.id, row_number() over (partition by c.id order by p.sort_order)
from public.products p
join public.collections c on c.collection_id in ('japan-buyer-picks', 'export-best-items', 'new-arrivals')
where p.code in ('NB-001', 'NB-002', 'NB-003', 'NB-004', 'NB-005')
on conflict (product_id, collection_id) do update set sort_order = excluded.sort_order;

insert into public.product_prices (product_id, market, currency, wholesale_price, retail_price, moq, min_order_amount, visible_to, is_active)
select p.id, price.market, price.currency, price.wholesale_price, price.retail_price, price.moq, price.min_order_amount, 'approved_only', true
from public.products p
join (
  values
    ('NB-001', 'JP', 'JPY', 1100::numeric, 3600::numeric, 20, 0::numeric),
    ('NB-001', 'US', 'USD', 8.50::numeric, 24.00::numeric, 20, 0::numeric),
    ('NB-001', 'GLOBAL', 'USD', 8.00::numeric, 22.00::numeric, 20, 0::numeric),
    ('NB-002', 'JP', 'JPY', 1400::numeric, 4200::numeric, 20, 0::numeric),
    ('NB-002', 'US', 'USD', 10.00::numeric, 28.00::numeric, 20, 0::numeric),
    ('NB-002', 'GLOBAL', 'USD', 9.50::numeric, 26.00::numeric, 20, 0::numeric),
    ('NB-003', 'JP', 'JPY', 1800::numeric, 5200::numeric, 12, 0::numeric),
    ('NB-004', 'JP', 'JPY', 3200::numeric, 8800::numeric, 10, 0::numeric),
    ('NB-005', 'JP', 'JPY', 1600::numeric, 4600::numeric, 20, 0::numeric)
) as price(code, market, currency, wholesale_price, retail_price, moq, min_order_amount) on price.code = p.code
on conflict (product_id, market) do update set
  currency = excluded.currency,
  wholesale_price = excluded.wholesale_price,
  retail_price = excluded.retail_price,
  moq = excluded.moq,
  min_order_amount = excluded.min_order_amount,
  visible_to = excluded.visible_to,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.inquiries (inquiry_number, buyer_id, market, currency, status, total_items, total_quantity, estimated_total, request_memo)
select
  'INQ-MOCK-001',
  b.id,
  b.assigned_market,
  b.currency,
  'requested',
  2,
  60,
  72000,
  'Please confirm lead time for these piercing styles.'
from public.buyers b
where b.company_name = 'Tokyo Piercing Lab'
on conflict (inquiry_number) do update set
  status = excluded.status,
  total_items = excluded.total_items,
  total_quantity = excluded.total_quantity,
  estimated_total = excluded.estimated_total,
  request_memo = excluded.request_memo,
  updated_at = now();

insert into public.inquiry_items (inquiry_id, product_id, product_code, product_name, category_id, material, color, size, quantity, moq, price_snapshot, subtotal)
select i.id, p.id, p.code, p.name_en, p.category_id, p.material, item.color, item.size, item.quantity, pp.moq, item.price_snapshot, item.subtotal
from public.inquiries i
join (
  values
    ('NB-001', 'Silver', '6mm', 40, 1100::numeric, 44000::numeric),
    ('NB-002', 'Silver', '8mm', 20, 1400::numeric, 28000::numeric)
) as item(code, color, size, quantity, price_snapshot, subtotal) on true
join public.products p on p.code = item.code
join public.product_prices pp on pp.product_id = p.id and pp.market = 'JP'
where i.inquiry_number = 'INQ-MOCK-001'
  and not exists (
    select 1
    from public.inquiry_items existing
    where existing.inquiry_id = i.id
      and existing.product_code = item.code
      and existing.color = item.color
      and existing.size = item.size
  );

insert into public.admin_quotes (inquiry_id, status, confirmed_total, currency, lead_time, shipping_note, admin_memo, quoted_by, quoted_at)
select
  i.id,
  'sent',
  72000,
  i.currency,
  '10-14 days',
  'Shipping terms will be confirmed by Noblesse manager.',
  'Mock admin quote for development review.',
  u.id,
  now()
from public.inquiries i
join public.users u on u.email = 'admin@noblesse.example'
where i.inquiry_number = 'INQ-MOCK-001'
  and not exists (
    select 1
    from public.admin_quotes aq
    where aq.inquiry_id = i.id
  );

insert into public.admin_quote_items (admin_quote_id, product_id, product_code, requested_quantity, confirmed_quantity, requested_price_snapshot, confirmed_unit_price, confirmed_subtotal)
select aq.id, p.id, ii.product_code, ii.quantity, ii.quantity, ii.price_snapshot, ii.price_snapshot, ii.subtotal
from public.admin_quotes aq
join public.inquiries i on i.id = aq.inquiry_id
join public.inquiry_items ii on ii.inquiry_id = i.id
join public.products p on p.code = ii.product_code
where i.inquiry_number = 'INQ-MOCK-001'
  and not exists (
    select 1
    from public.admin_quote_items aqi
    where aqi.admin_quote_id = aq.id
      and aqi.product_code = ii.product_code
  );
