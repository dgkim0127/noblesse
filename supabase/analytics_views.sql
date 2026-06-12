-- Noblesse Piercing analytics views for PostgreSQL.
-- These views aggregate Request Quote and admin quote workflow data.
-- They are PostgreSQL-compatible and do not require Supabase-specific features.

create or replace view public.v_top_requested_products_30d as
select
  ii.product_code,
  ii.product_name,
  i.currency,
  coalesce(sum(ii.quantity), 0) as requested_quantity,
  coalesce(sum(ii.subtotal), 0)::numeric(14,2) as requested_amount,
  count(distinct i.id) as inquiry_count
from public.inquiry_items ii
join public.inquiries i on i.id = ii.inquiry_id
where i.created_at >= now() - interval '30 days'
group by ii.product_code, ii.product_name, i.currency;

create or replace view public.v_top_requested_products_by_market as
select
  i.market,
  i.currency,
  ii.product_code,
  ii.product_name,
  coalesce(sum(ii.quantity), 0) as requested_quantity,
  coalesce(sum(ii.subtotal), 0)::numeric(14,2) as requested_amount,
  count(distinct i.buyer_id) as buyer_count
from public.inquiry_items ii
join public.inquiries i on i.id = ii.inquiry_id
group by i.market, i.currency, ii.product_code, ii.product_name;

create or replace view public.v_buyer_inquiry_summary as
select
  b.id as buyer_id,
  b.company_name,
  i.market,
  i.currency,
  count(i.id) as inquiry_count,
  coalesce(sum(i.total_quantity), 0) as total_quantity,
  coalesce(sum(i.estimated_total), 0)::numeric(14,2) as estimated_total,
  max(i.created_at) as latest_inquiry_at
from public.buyers b
left join public.inquiries i on i.buyer_id = b.id
group by b.id, b.company_name, i.market, i.currency;

create or replace view public.v_category_inquiry_summary as
select
  c.id as category_uuid,
  c.category_id,
  c.name_en,
  i.market,
  i.currency,
  coalesce(sum(ii.quantity), 0) as requested_quantity,
  coalesce(sum(ii.subtotal), 0)::numeric(14,2) as requested_amount,
  count(distinct i.id) as inquiry_count
from public.inquiry_items ii
join public.inquiries i on i.id = ii.inquiry_id
left join public.categories c on c.id = ii.category_id
group by c.id, c.category_id, c.name_en, i.market, i.currency;

create or replace view public.v_quote_conversion_monthly as
select
  date_trunc('month', i.created_at)::date as month,
  i.market,
  i.currency,
  count(distinct i.id) as requested_count,
  count(distinct aq.inquiry_id) filter (where aq.status in ('sent', 'accepted')) as quoted_count,
  count(distinct aq.inquiry_id) filter (where aq.status = 'accepted') as accepted_count,
  case
    when count(distinct i.id) = 0 then null
    else round(
      (count(distinct aq.inquiry_id) filter (where aq.status in ('sent', 'accepted'))::numeric
        / count(distinct i.id)::numeric) * 100,
      2
    )
  end as quote_rate
from public.inquiries i
left join public.admin_quotes aq on aq.inquiry_id = i.id
group by date_trunc('month', i.created_at)::date, i.market, i.currency;

create or replace view public.v_popular_option_combinations as
select
  ii.product_code,
  ii.product_name,
  coalesce(ii.color, 'Unspecified') as color,
  coalesce(ii.size, 'Unspecified') as size,
  coalesce(sum(ii.quantity), 0) as requested_quantity,
  count(distinct ii.inquiry_id) as inquiry_count
from public.inquiry_items ii
group by ii.product_code, ii.product_name, coalesce(ii.color, 'Unspecified'), coalesce(ii.size, 'Unspecified');

create or replace view public.v_monthly_inquiry_trend as
select
  date_trunc('month', created_at)::date as month,
  market,
  currency,
  count(*) as inquiry_count,
  coalesce(sum(total_quantity), 0) as total_quantity,
  coalesce(sum(estimated_total), 0)::numeric(14,2) as estimated_total
from public.inquiries
group by date_trunc('month', created_at)::date, market, currency;
