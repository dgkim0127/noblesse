# POS Analytics Queries

This document provides local PostgreSQL analytics queries for POS sales, buyer behavior, and product reporting.

These queries are for development/testing and admin analytics planning.
They do not connect the website to a database and do not change POS data.

## 1. Buyer Purchase Count

Purpose:

- Count how many sales each buyer has.

SQL:

```sql
select
  b.id as buyer_id,
  b.customer_name,
  count(ps.id) as purchase_count
from buyers b
left join pos_sales ps on ps.buyer_id = b.id
group by b.id, b.customer_name
order by purchase_count desc, b.customer_name;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- purchase_count: number of sales

Admin screen:

- Buyer list
- Buyer detail summary

## 2. Buyer Total Purchase Amount

Purpose:

- Sum total sales amount by buyer.

SQL:

```sql
select
  b.id as buyer_id,
  b.customer_name,
  coalesce(sum(ps.total_amount), 0) as total_purchase_amount
from buyers b
left join pos_sales ps on ps.buyer_id = b.id
group by b.id, b.customer_name
order by total_purchase_amount desc, b.customer_name;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- total_purchase_amount: total sales amount

Admin screen:

- Buyer ranking
- Buyer detail summary

## 3. Buyer Average Purchase Amount

Purpose:

- Calculate average amount per sale for each buyer.

SQL:

```sql
select
  b.id as buyer_id,
  b.customer_name,
  count(ps.id) as purchase_count,
  coalesce(round(sum(ps.total_amount)::numeric / nullif(count(ps.id), 0)), 0) as average_purchase_amount
from buyers b
left join pos_sales ps on ps.buyer_id = b.id
group by b.id, b.customer_name
order by average_purchase_amount desc, b.customer_name;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- purchase_count: number of sales
- average_purchase_amount: average amount per sale

Admin screen:

- Buyer quality dashboard
- Buyer detail summary

## 4. Buyer Latest Purchase Date

Purpose:

- Find the latest sale date for each buyer.

SQL:

```sql
select
  b.id as buyer_id,
  b.customer_name,
  max(ps.sale_date) as latest_purchase_date
from buyers b
left join pos_sales ps on ps.buyer_id = b.id
group by b.id, b.customer_name
order by latest_purchase_date desc nulls last, b.customer_name;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- latest_purchase_date: most recent sale date

Admin screen:

- Buyer follow-up list
- Inactive buyer review

## 5. Buyer Total Purchase Quantity

Purpose:

- Sum item quantity purchased by each buyer.

SQL:

```sql
select
  b.id as buyer_id,
  b.customer_name,
  coalesce(sum(psi.quantity), 0) as total_quantity
from buyers b
left join pos_sales ps on ps.buyer_id = b.id
left join pos_sale_items psi on psi.pos_sale_id = ps.id
group by b.id, b.customer_name
order by total_quantity desc, b.customer_name;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- total_quantity: total item quantity

Admin screen:

- Buyer volume dashboard
- Buyer detail summary

## 6. Monthly Buyer Purchase Amount

Purpose:

- Show monthly sales amount by buyer.

SQL:

```sql
select
  b.id as buyer_id,
  b.customer_name,
  date_trunc('month', ps.sale_date)::date as month,
  sum(ps.total_amount) as monthly_purchase_amount
from buyers b
join pos_sales ps on ps.buyer_id = b.id
group by b.id, b.customer_name, date_trunc('month', ps.sale_date)::date
order by month desc, monthly_purchase_amount desc;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- month: month bucket
- monthly_purchase_amount: total amount in the month

Admin screen:

- Monthly buyer analytics
- Buyer trend chart

## 7. Month-over-Month Buyer Amount Change

Purpose:

- Compare current month buyer amount against previous month.

SQL:

```sql
with monthly as (
  select
    ps.buyer_id,
    date_trunc('month', ps.sale_date)::date as month,
    sum(ps.total_amount) as amount
  from pos_sales ps
  group by ps.buyer_id, date_trunc('month', ps.sale_date)::date
),
with_previous as (
  select
    monthly.*,
    lag(amount) over (partition by buyer_id order by month) as previous_amount
  from monthly
)
select
  b.id as buyer_id,
  b.customer_name,
  wp.month,
  wp.amount as current_amount,
  wp.previous_amount,
  case
    when wp.previous_amount is null or wp.previous_amount = 0 then null
    else round(((wp.amount - wp.previous_amount)::numeric / wp.previous_amount) * 100, 2)
  end as amount_change_rate
from with_previous wp
join buyers b on b.id = wp.buyer_id
order by wp.month desc, amount_change_rate desc nulls last;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- month: month bucket
- current_amount: current month amount
- previous_amount: previous month amount
- amount_change_rate: percentage change

Admin screen:

- Buyer trend dashboard
- Growth/decline alerts

## 8. Month-over-Month Buyer Quantity Change

Purpose:

- Compare current month buyer quantity against previous month.

SQL:

```sql
with monthly as (
  select
    ps.buyer_id,
    date_trunc('month', ps.sale_date)::date as month,
    sum(psi.quantity) as quantity
  from pos_sales ps
  join pos_sale_items psi on psi.pos_sale_id = ps.id
  group by ps.buyer_id, date_trunc('month', ps.sale_date)::date
),
with_previous as (
  select
    monthly.*,
    lag(quantity) over (partition by buyer_id order by month) as previous_quantity
  from monthly
)
select
  b.id as buyer_id,
  b.customer_name,
  wp.month,
  wp.quantity as current_quantity,
  wp.previous_quantity,
  case
    when wp.previous_quantity is null or wp.previous_quantity = 0 then null
    else round(((wp.quantity - wp.previous_quantity)::numeric / wp.previous_quantity) * 100, 2)
  end as quantity_change_rate
from with_previous wp
join buyers b on b.id = wp.buyer_id
order by wp.month desc, quantity_change_rate desc nulls last;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- month: month bucket
- current_quantity: current month quantity
- previous_quantity: previous month quantity
- quantity_change_rate: percentage change

Admin screen:

- Buyer trend dashboard
- Volume change review

## 9. Frequently Purchased Products by Buyer

Purpose:

- Find products each buyer purchases most often by quantity.

SQL:

```sql
select
  b.id as buyer_id,
  b.customer_name,
  coalesce(psi.product_code, p.product_code) as product_code,
  coalesce(p.product_name, psi.item_name) as product_name,
  sum(psi.quantity) as total_quantity,
  sum(psi.line_total_amount) as total_amount
from buyers b
join pos_sales ps on ps.buyer_id = b.id
join pos_sale_items psi on psi.pos_sale_id = ps.id
left join products p on p.id = psi.product_id
group by b.id, b.customer_name, coalesce(psi.product_code, p.product_code), coalesce(p.product_name, psi.item_name)
order by b.customer_name, total_quantity desc, total_amount desc;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- product_code: product code when available
- product_name: product display name
- total_quantity: purchased quantity
- total_amount: purchased amount

Admin screen:

- Buyer detail product preference
- Reorder recommendation planning

## 10. Category Preference by Buyer

Purpose:

- Find preferred categories for each buyer.

SQL:

```sql
select
  b.id as buyer_id,
  b.customer_name,
  psi.category_id,
  coalesce(psi.category_name, psi.category_id) as category_name,
  sum(psi.quantity) as total_quantity,
  sum(psi.line_total_amount) as total_amount
from buyers b
join pos_sales ps on ps.buyer_id = b.id
join pos_sale_items psi on psi.pos_sale_id = ps.id
group by b.id, b.customer_name, psi.category_id, coalesce(psi.category_name, psi.category_id)
order by b.customer_name, total_quantity desc, total_amount desc;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- category_id: category identifier
- category_name: category display name
- total_quantity: purchased quantity
- total_amount: purchased amount

Admin screen:

- Buyer detail category preference
- Catalog recommendation planning

## 11. Inactive Buyer Candidates

Purpose:

- Identify buyers whose latest purchase is older than a threshold.

SQL:

```sql
select
  b.id as buyer_id,
  b.customer_name,
  max(ps.sale_date) as latest_purchase_date,
  current_date - max(ps.sale_date)::date as inactive_days
from buyers b
left join pos_sales ps on ps.buyer_id = b.id
group by b.id, b.customer_name
having max(ps.sale_date) is null
   or current_date - max(ps.sale_date)::date >= 30
order by inactive_days desc nulls first, b.customer_name;
```

Result columns:

- buyer_id: internal buyer ID
- customer_name: buyer/customer display name
- latest_purchase_date: most recent sale date
- inactive_days: days since latest sale

Admin screen:

- Inactive buyer list
- Follow-up task planning

## 12. Product Total Sales Quantity

Purpose:

- Rank products by total sold quantity.

SQL:

```sql
select
  p.id as product_id,
  coalesce(p.product_code, psi.product_code) as product_code,
  coalesce(p.product_name, psi.item_name) as product_name,
  sum(psi.quantity) as total_quantity,
  sum(psi.line_total_amount) as total_amount
from pos_sale_items psi
left join products p on p.id = psi.product_id
group by p.id, coalesce(p.product_code, psi.product_code), coalesce(p.product_name, psi.item_name)
order by total_quantity desc, total_amount desc;
```

Result columns:

- product_id: internal product ID
- product_code: product code when available
- product_name: product display name
- total_quantity: total sold quantity
- total_amount: total sold amount

Admin screen:

- Product ranking
- Product detail analytics

## 13. Buyer Count by Product

Purpose:

- Count how many distinct buyers purchased each product.

SQL:

```sql
select
  p.id as product_id,
  coalesce(p.product_code, psi.product_code) as product_code,
  coalesce(p.product_name, psi.item_name) as product_name,
  count(distinct ps.buyer_id) as buyer_count
from pos_sale_items psi
join pos_sales ps on ps.id = psi.pos_sale_id
left join products p on p.id = psi.product_id
group by p.id, coalesce(p.product_code, psi.product_code), coalesce(p.product_name, psi.item_name)
order by buyer_count desc, product_name;
```

Result columns:

- product_id: internal product ID
- product_code: product code when available
- product_name: product display name
- buyer_count: distinct buyer count

Admin screen:

- Product demand dashboard
- Best-seller candidate review

## 14. Monthly Product Sales Trend

Purpose:

- Show monthly quantity and amount by product.

SQL:

```sql
select
  p.id as product_id,
  coalesce(p.product_code, psi.product_code) as product_code,
  coalesce(p.product_name, psi.item_name) as product_name,
  date_trunc('month', ps.sale_date)::date as month,
  sum(psi.quantity) as monthly_quantity,
  sum(psi.line_total_amount) as monthly_amount
from pos_sale_items psi
join pos_sales ps on ps.id = psi.pos_sale_id
left join products p on p.id = psi.product_id
group by p.id, coalesce(p.product_code, psi.product_code), coalesce(p.product_name, psi.item_name), date_trunc('month', ps.sale_date)::date
order by month desc, monthly_quantity desc, monthly_amount desc;
```

Result columns:

- product_id: internal product ID
- product_code: product code when available
- product_name: product display name
- month: month bucket
- monthly_quantity: monthly sold quantity
- monthly_amount: monthly sold amount

Admin screen:

- Product trend chart
- Product monthly report
