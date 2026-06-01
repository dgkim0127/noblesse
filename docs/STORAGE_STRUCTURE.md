# Firebase Storage Structure

This document defines the future Firebase Storage paths for Noblesse catalog assets.
Do not connect Firebase Storage in version 1. Use mock URLs with the same path shape.

## Product Images

Store the original upload separately from generated WebP derivatives.

```text
/products/{productId}/original/original.jpg
/products/{productId}/thumb/thumb.webp
/products/{productId}/card/card.webp
/products/{productId}/detail/detail.webp
/products/{productId}/zoom/zoom.webp
```

| Variant | Target Size | Format | Intended Use |
| --- | ---: | --- | --- |
| `original` | Source size | JPG or original format | Admin upload source only |
| `thumb` | 300px | WebP | Compact lists and Inquiry rows |
| `card` | 600px | WebP | Product cards |
| `detail` | 1200px | WebP | Product Detail main image |
| `zoom` | 1800px | WebP | Product Detail zoom view |

Firestore `products.imageSet` stores only the derivative URLs:

```js
imageSet: {
  thumb: "https://cdn.example.com/products/KZ-P-1004/thumb/thumb.webp",
  card: "https://cdn.example.com/products/KZ-P-1004/card/card.webp",
  detail: "https://cdn.example.com/products/KZ-P-1004/detail/detail.webp",
  zoom: "https://cdn.example.com/products/KZ-P-1004/zoom/zoom.webp"
}
```

## Banner Images

```text
/banners/{bannerId}/desktop.webp
/banners/{bannerId}/mobile.webp
```

- Use `desktop.webp` for wide desktop and tablet banners.
- Use `mobile.webp` for mobile-first banner crops.
- Firestore `banners` documents store `desktopImageUrl` and `mobileImageUrl`.

## Category Covers

```text
/categories/{categoryId}/cover.webp
```

- Use a square or near-square cover image suitable for category shortcuts and category landing pages.
- Firestore `categories.coverUrl` stores the URL.

## Collection Covers

```text
/collections/{collectionId}/cover.webp
```

- Use an editorial cover image for curated jewelry collections.
- Firestore `collections.coverUrl` stores the URL.

## PDF Catalogs

```text
/catalogs/public/noblesse-public-catalog.pdf
/catalogs/jp/noblesse-jp-catalog.pdf
/catalogs/us/noblesse-us-catalog.pdf
```

- Public PDFs may be accessible to guests.
- Market PDFs should be available only to approved Buyers assigned to that market and to admins.
- Firestore `catalogFiles.fileUrl` stores the PDF URL and metadata.

## Access Planning

| Path | Read Access | Write Access |
| --- | --- | --- |
| `/products/**` derivative images | Public | `admin` only |
| `/products/**/original/**` | `admin` only | `admin` only |
| `/banners/**` | Public | `admin` only |
| `/categories/**` | Public | `admin` only |
| `/collections/**` | Public | `admin` only |
| `/catalogs/public/**` | Public | `admin` only |
| `/catalogs/jp/**` | Approved JP Buyers and `admin` | `admin` only |
| `/catalogs/us/**` | Approved US Buyers and `admin` | `admin` only |

## Processing Notes

- Do not store binary image data in Firestore.
- Preserve original uploads for future reprocessing.
- Generate WebP derivatives before publishing product metadata.
- Use Firebase Hosting or a CDN URL for delivery.
- Keep mock image URLs structurally identical to future Storage URLs.

