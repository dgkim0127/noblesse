-- Local PostgreSQL analytics views for Noblesse POS reporting.
-- POS APK must not connect directly to PostgreSQL.
-- Production writes must go through an API layer.
-- This file is non-destructive and uses create or replace view only.

create or replace view v_buyer_purchase_summary as
select
  b.id as buyer_id,
  b.customer_name,
  ps.currency,
  count(ps.id) as purchase_count,
  coalesce(sum(ps.total_amount), 0) as total_purchase_amount,
  coalesce(round(sum(ps.total_amount)::numeric / nullif(count(ps.id), 0)), 0) as average_purchase_amount,
  max(ps.sale_date) as latest_purchase_date,
  coalesce(sum(ps.total_quantity), 0) as total_quantity
from buyers b
join pos_sales ps on ps.buyer_id = b.id
group by b.id, b.customer_name, ps.currency;

create or replace view v_buyer_monthly_amount_change as
with monthly as (
  select
    ps.buyer_id,
    ps.currency,
    date_trunc('month', ps.sale_date)::date as month,
    sum(ps.total_amount) as amount
  from pos_sales ps
  group by ps.buyer_id, ps.currency, date_trunc('month', ps.sale_date)::date
),
with_previous as (
  select
    monthly.*,
    lag(amount) over (
      partition by buyer_id, currency
      order by month
    ) as previous_amount
  from monthly
)
select
  b.id as buyer_id,
  b.customer_name,
  wp.currency,
  wp.month,
  wp.amount as current_amount,
  wp.previous_amount,
  wp.amount - coalesce(wp.previous_amount, 0) as amount_delta,
  case
    when wp.previous_amount is null or wp.previous_amount = 0 then null
    else round(((wp.amount - wp.previous_amount)::numeric / wp.previous_amount) * 100, 2)
  end as amount_change_rate
from with_previous wp
join buyers b on b.id = wp.buyer_id;

create or replace view v_buyer_product_summary as
select
  b.id as buyer_id,
  b.customer_name,
  ps.currency,
  coalesce(psi.product_code, p.product_code) as product_code,
  coalesce(p.product_name, psi.item_name) as product_name,
  sum(psi.quantity) as total_quantity,
  sum(psi.line_total_amount) as total_amount
from buyers b
join pos_sales ps on ps.buyer_id = b.id
join pos_sale_items psi on psi.pos_sale_id = ps.id
left join products p on p.id = psi.product_id
group by
  b.id,
  b.customer_name,
  ps.currency,
  coalesce(psi.product_code, p.product_code),
  coalesce(p.product_name, psi.item_name);

create or replace view v_buyer_product_quantity_change as
with monthly_product_quantity as (
  select
    ps.buyer_id,
    ps.currency,
    coalesce(psi.product_code, p.product_code) as product_code,
    coalesce(p.product_name, psi.item_name) as product_name,
    date_trunc('month', ps.sale_date)::date as month,
    sum(psi.quantity) as total_quantity
  from pos_sales ps
  join pos_sale_items psi on psi.pos_sale_id = ps.id
  left join products p on p.id = psi.product_id
  group by
    ps.buyer_id,
    ps.currency,
    coalesce(psi.product_code, p.product_code),
    coalesce(p.product_name, psi.item_name),
    date_trunc('month', ps.sale_date)::date
),
with_previous as (
  select
    monthly_product_quantity.*,
    lag(total_quantity) over (
      partition by buyer_id, currency, product_code, product_name
      order by month
    ) as previous_quantity
  from monthly_product_quantity
)
select
  b.id as buyer_id,
  b.customer_name,
  wp.currency,
  wp.product_code,
  wp.product_name,
  wp.month,
  wp.total_quantity as current_quantity,
  wp.previous_quantity,
  wp.total_quantity - coalesce(wp.previous_quantity, 0) as quantity_delta,
  case
    when wp.previous_quantity is null or wp.previous_quantity = 0 then null
    else round(((wp.total_quantity - wp.previous_quantity)::numeric / wp.previous_quantity) * 100, 2)
  end as quantity_change_rate
from with_previous wp
join buyers b on b.id = wp.buyer_id;

create or replace view v_buyer_reduced_products as
select
  buyer_id,
  customer_name,
  currency,
  product_code,
  product_name,
  month,
  current_quantity,
  previous_quantity,
  quantity_delta,
  quantity_change_rate
from v_buyer_product_quantity_change
where previous_quantity is not null
  and current_quantity < previous_quantity;

create or replace view v_product_monthly_trend as
select
  p.id as product_id,
  coalesce(p.product_code, psi.product_code) as product_code,
  coalesce(p.product_name, psi.item_name) as product_name,
  ps.currency,
  date_trunc('month', ps.sale_date)::date as month,
  sum(psi.quantity) as monthly_quantity,
  sum(psi.line_total_amount) as monthly_amount,
  count(distinct ps.buyer_id) as buyer_count
from pos_sale_items psi
join pos_sales ps on ps.id = psi.pos_sale_id
left join products p on p.id = psi.product_id
group by
  p.id,
  coalesce(p.product_code, psi.product_code),
  coalesce(p.product_name, psi.item_name),
  ps.currency,
  date_trunc('month', ps.sale_date)::date;

create or replace view v_inactive_buyer_candidates as
select
  b.id as buyer_id,
  b.customer_name,
  max(ps.sale_date) as latest_purchase_date,
  current_date - max(ps.sale_date)::date as inactive_days
from buyers b
left join pos_sales ps on ps.buyer_id = b.id
group by b.id, b.customer_name
having max(ps.sale_date) is null
   or current_date - max(ps.sale_date)::date >= 30;
