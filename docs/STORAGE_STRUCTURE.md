# Firebase Storage Structure

This document defines the future Firebase Storage paths for Noblesse Piercing assets.
Version 1 remains mock-only. Firestore stores URLs; Storage stores actual files.

## Product Images

```text
/products/{productId}/original/original.jpg
/products/{productId}/thumb/thumb.webp
/products/{productId}/card/card.webp
/products/{productId}/detail/detail.webp
/products/{productId}/zoom/zoom.webp
```

| Variant | Size | Use |
| --- | ---: | --- |
| `original` | source | Reprocessing source only |
| `thumb` | 300px WebP | Inquiry List, My Inquiries, compact thumbnails |
| `card` | 600px WebP | Product Card, Product List, Home sections |
| `detail` | 1200px WebP | Product Detail main image |
| `zoom` | 1800px WebP | Product Detail gallery or zoom |

Original uploads may be JPG or PNG. Display variants use WebP.

Firestore stores derivative URLs only:

```js
imageSet: {
  thumb: "https://cdn.example.com/products/NB-001/thumb/thumb.webp",
  card: "https://cdn.example.com/products/NB-001/card/card.webp",
  detail: "https://cdn.example.com/products/NB-001/detail/detail.webp",
  zoom: "https://cdn.example.com/products/NB-001/zoom/zoom.webp"
}
```

## Editorial Images

```text
/banners/{bannerId}/desktop.webp
/banners/{bannerId}/mobile.webp
/categories/{categoryId}/cover.webp
/collections/{collectionId}/cover.webp
```

| Path | Use |
| --- | --- |
| `/banners/{bannerId}/desktop.webp` | Desktop and tablet banner |
| `/banners/{bannerId}/mobile.webp` | Mobile banner crop |
| `/categories/{categoryId}/cover.webp` | Category shortcut or landing cover |
| `/collections/{collectionId}/cover.webp` | Editorial collection cover |

## PDF Catalogs

```text
/catalogs/public/noblesse-public-catalog.pdf
/catalogs/jp/noblesse-jp-catalog.pdf
/catalogs/us/noblesse-us-catalog.pdf
```

- Public catalogs must omit protected Buyer prices.
- Market catalogs may include approved Buyer content and require matching market access.

## Storage Access Summary

| Path | Read | Write |
| --- | --- | --- |
| `/products/**/original/**` | `admin` | `admin` |
| `/products/**` display variants | Public | `admin` |
| `/banners/**`, `/categories/**`, `/collections/**` | Public | `admin` |
| `/catalogs/public/**` | Public | `admin` |
| `/catalogs/jp/**` | Approved JP Buyers and `admin` | `admin` |
| `/catalogs/us/**` | Approved US Buyers and `admin` | `admin` |

## Frontend Performance Policy

- Use native lazy loading for images below the initial viewport.
- Always provide width and height or a stable aspect-ratio image box.
- Avoid layout shifts while assets load.
- Prefer versioned or hashed filenames when an asset can be replaced.
- Keep the stable path examples above for documentation; production publishing may append a version or content hash.

Suggested `Cache-Control` draft:

| Asset Type | Suggested Header |
| --- | --- |
| Hashed WebP derivatives | `public, max-age=31536000, immutable` |
| Stable editorial URLs | `public, max-age=3600, stale-while-revalidate=86400` |
| Protected PDFs | `private, max-age=300` |
| Original uploads | `private, no-store` |

## Future Processing Pipeline

1. An admin uploads an original JPG or PNG.
2. A trusted Cloud Function generates `thumb`, `card`, `detail`, and `zoom` WebP variants.
3. Product metadata is published only after variants are ready.
4. CDN caching is strengthened for versioned assets.
5. AVIF derivatives may be evaluated after WebP delivery is stable.

## Version 1 Boundary

- Do not connect Firebase Storage yet.
- Keep mock URLs structurally similar to future Storage URLs.
- Do not store image binaries in Firestore.
