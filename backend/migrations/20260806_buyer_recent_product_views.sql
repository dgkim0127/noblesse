CREATE TABLE IF NOT EXISTS public.buyer_recent_product_views (
  buyer_id uuid NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_id, product_id)
);

CREATE INDEX IF NOT EXISTS buyer_recent_product_views_buyer_viewed_idx
  ON public.buyer_recent_product_views (buyer_id, viewed_at DESC, product_id);
