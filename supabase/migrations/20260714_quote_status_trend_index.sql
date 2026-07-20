create index if not exists idx_admin_quote_status_history_created_status
  on public.admin_quote_status_history(created_at desc, to_status);
