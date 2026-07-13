-- Admin-managed catalog images and unpublished product visibility.
-- Product images are intentionally public storefront assets; all writes remain
-- limited to approved Noblesse administrators.

drop policy if exists "products public read" on public.products;
create policy "products public or admin read" on public.products
  for select using (is_visible = true or public.is_quote_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "admin product images write" on storage.objects;
create policy "admin product images write" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_quote_admin())
  with check (bucket_id = 'product-images' and public.is_quote_admin());
