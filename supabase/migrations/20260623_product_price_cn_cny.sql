-- N39-A draft only: extend explicit market/currency price books.
-- Do not execute until APPROVE_STAGING_MULTI_CURRENCY_MIGRATION = YES.
-- Existing rows and amounts are intentionally unchanged.

alter table public.buyers
  drop constraint if exists buyers_assigned_market_check,
  add constraint buyers_assigned_market_check check (assigned_market in ('KR', 'JP', 'US', 'CN', 'GLOBAL'));

alter table public.buyers
  drop constraint if exists buyers_currency_check,
  add constraint buyers_currency_check check (currency in ('KRW', 'JPY', 'USD', 'CNY'));

alter table public.product_prices
  drop constraint if exists product_prices_market_check,
  add constraint product_prices_market_check check (market in ('KR', 'JP', 'US', 'CN', 'GLOBAL'));

alter table public.product_prices
  drop constraint if exists product_prices_currency_check,
  add constraint product_prices_currency_check check (currency in ('KRW', 'JPY', 'USD', 'CNY'));

alter table public.inquiries
  drop constraint if exists inquiries_market_check,
  add constraint inquiries_market_check check (market in ('KR', 'JP', 'US', 'CN', 'GLOBAL'));

alter table public.inquiries
  drop constraint if exists inquiries_currency_check,
  add constraint inquiries_currency_check check (currency in ('KRW', 'JPY', 'USD', 'CNY'));

alter table public.admin_quotes
  drop constraint if exists admin_quotes_currency_check,
  add constraint admin_quotes_currency_check check (currency in ('KRW', 'JPY', 'USD', 'CNY'));

alter table public.catalog_files
  drop constraint if exists catalog_files_market_check,
  add constraint catalog_files_market_check check (market in ('KR', 'JP', 'US', 'CN', 'GLOBAL'));
