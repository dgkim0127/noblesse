ALTER TABLE pos_quote_states
  ADD COLUMN IF NOT EXISTS is_online_quote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS published_document_id uuid REFERENCES admin_quote_documents(id),
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_receipt_id text,
  ADD COLUMN IF NOT EXISTS linked_receipt_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS receipt_linked_at timestamptz;
