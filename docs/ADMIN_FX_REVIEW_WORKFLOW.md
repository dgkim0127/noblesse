# Admin FX Review Workflow

## Deprecated

The previous approval-draft FX workflow is deprecated and must not be used for current implementation decisions.

Removed model:

- pending price draft queue
- approve/reject publication flow
- approval-only foreign price publication
- `fx_price_drafts`
- `fx_review_runs`

Current model:

- `manual_fixed` prices remain fixed until an admin edits them.
- `fx_auto` prices are created or updated automatically when the 5% / 15% / 72h policy gates pass.
- Admins monitor current price, reference price, divergence, latest rate, status, and history from the FX page.

Authoritative current document:

- `docs/ADMIN_FX_AUTO_PRICING_WORKFLOW.md`

## No-Go Until Separate Approval

- Staging/prod migration execution
- External provider network fetch
- Cloud Run Job deployment or execution
- Cloud Scheduler creation
- Real product price mutation
- Secret or IAM changes
