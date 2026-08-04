CREATE TABLE IF NOT EXISTS public.pos_customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  discount_rate numeric(7,4) NOT NULL DEFAULT 0,
  vat_enabled boolean NOT NULL DEFAULT true,
  is_overseas boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  pricing_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_version bigint NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pos_customers_discount_rate_range
    CHECK (discount_rate >= 0 AND discount_rate <= 100)
);

CREATE TABLE IF NOT EXISTS public.pos_items (
  id text PRIMARY KEY,
  code text,
  name text NOT NULL,
  category_id text,
  base_price numeric(14,2) NOT NULL DEFAULT 0,
  discountable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  pricing_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_version bigint NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pos_items_base_price_nonnegative CHECK (base_price >= 0)
);

CREATE TABLE IF NOT EXISTS public.buyer_pos_links (
  buyer_id uuid PRIMARY KEY REFERENCES public.buyers(id) ON DELETE CASCADE,
  pos_customer_id text NOT NULL REFERENCES public.pos_customers(id) ON DELETE RESTRICT,
  linked_by_uid text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buyer_pos_links_customer_idx
  ON public.buyer_pos_links(pos_customer_id);

CREATE TABLE IF NOT EXISTS public.product_pos_links (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  pos_item_id text NOT NULL REFERENCES public.pos_items(id) ON DELETE RESTRICT,
  linked_by_uid text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_pos_links_item_idx
  ON public.product_pos_links(pos_item_id);

CREATE TABLE IF NOT EXISTS public.pos_quote_states (
  admin_quote_id uuid PRIMARY KEY REFERENCES public.admin_quotes(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  pos_customer_id text REFERENCES public.pos_customers(id) ON DELETE SET NULL,
  customer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  deduction_amount numeric(14,2) NOT NULL DEFAULT 0,
  last_preview jsonb,
  finalized_snapshot jsonb,
  finalized_document_id uuid REFERENCES public.admin_quote_documents(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  updated_by_uid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pos_quote_states_version_positive CHECK (version > 0),
  CONSTRAINT pos_quote_states_deduction_nonnegative CHECK (deduction_amount >= 0)
);

CREATE TABLE IF NOT EXISTS public.pos_quote_price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_quote_id uuid NOT NULL REFERENCES public.admin_quotes(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  calculation_version text NOT NULL,
  snapshot jsonb NOT NULL,
  created_by_uid text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_quote_id, revision)
);

CREATE INDEX IF NOT EXISTS pos_quote_price_snapshots_quote_idx
  ON public.pos_quote_price_snapshots(admin_quote_id, revision DESC);

CREATE TABLE IF NOT EXISTS public.pos_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_uid text NOT NULL,
  operation text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_uid, operation, idempotency_key),
  CONSTRAINT pos_idempotency_keys_status_check
    CHECK (status IN ('pending', 'completed'))
);
