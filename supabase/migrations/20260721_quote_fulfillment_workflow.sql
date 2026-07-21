-- Quote fulfillment workflow for offline SNS receipt, bank transfer, and shipment handling.

alter table public.admin_quotes
  add column if not exists workflow_version smallint,
  add column if not exists workflow_status text not null default 'received',
  add column if not exists workflow_note text;

update public.admin_quotes
set
  workflow_version = 1,
  workflow_status = case
    when status = 'accepted' then 'completed'
    when status in ('rejected', 'cancelled') then 'cancelled'
    else 'received'
  end
where workflow_version is null;

alter table public.admin_quotes
  alter column workflow_version set default 2,
  alter column workflow_version set not null,
  drop constraint if exists admin_quotes_workflow_status_check,
  add constraint admin_quotes_workflow_status_check
    check (workflow_status in ('received', 'picking', 'receipt_sent', 'payment_confirmed', 'shipped', 'completed', 'cancelled'));

alter table public.admin_quote_items
  add column if not exists fulfillment_status text,
  add column if not exists cancelled_quantity integer,
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_note text;

update public.admin_quote_items
set
  cancelled_quantity = greatest(coalesce(requested_quantity, 0) - coalesce(confirmed_quantity, 0), 0),
  fulfillment_status = case
    when coalesce(confirmed_quantity, 0) = 0 then 'cancelled'
    when confirmed_quantity < requested_quantity then 'partial'
    when confirmed_quantity = requested_quantity then 'ready'
    else 'pending'
  end,
  cancellation_reason = case
    when coalesce(confirmed_quantity, 0) < coalesce(requested_quantity, 0) then 'other'
    else null
  end
where fulfillment_status is null or cancelled_quantity is null;

alter table public.admin_quote_items
  alter column fulfillment_status set default 'pending',
  alter column fulfillment_status set not null,
  alter column cancelled_quantity set default 0,
  alter column cancelled_quantity set not null,
  drop constraint if exists admin_quote_items_fulfillment_status_check,
  add constraint admin_quote_items_fulfillment_status_check
    check (fulfillment_status in ('pending', 'ready', 'partial', 'cancelled')),
  drop constraint if exists admin_quote_items_cancelled_quantity_check,
  add constraint admin_quote_items_cancelled_quantity_check
    check (
      cancelled_quantity >= 0
      and (requested_quantity is null or cancelled_quantity <= requested_quantity)
    ),
  drop constraint if exists admin_quote_items_cancellation_reason_check,
  add constraint admin_quote_items_cancellation_reason_check
    check (cancellation_reason is null or cancellation_reason in ('out_of_stock', 'quantity_shortage', 'quality_issue', 'discontinued', 'other'));

alter table public.admin_quote_status_history
  add column if not exists event_type text not null default 'quote';

alter table public.admin_quote_status_history
  drop constraint if exists admin_quote_status_history_event_type_check,
  add constraint admin_quote_status_history_event_type_check
    check (event_type in ('quote', 'workflow'));

create index if not exists idx_admin_quotes_workflow_status_updated
  on public.admin_quotes(workflow_status, updated_at desc);
