# Noblesse Development Guidelines

## Project Definition

- This project is a website for Noblesse overseas buyers to browse a piercing B2B catalog.
- This project is not a mobile application.
- Do not create APK builds, Capacitor integrations, or mobile app project structures.
- Build responsive web experiences for mobile, tablet, and desktop viewports.

## Version 1 Scope

- Do not build shopping live features.
- Do not build reviews.
- Do not build immediate payment features.
- Do not use the terms `Cart`, `Checkout`, `Buy Now`, or `Pay Now` in the customer-facing UI.
- Use `Inquiry List` instead of cart-related terminology.
- Use `Request Quote` instead of purchase-related terminology.

## Data Strategy

- Implement version 1 with mock data before connecting to a live Firebase project.
- Mock data must use the same field names as the intended Firebase document structure.
- Do not store image binary data in the database.
- Store only Firebase Storage or CDN image URLs in database image fields.

## Member Access

Use these member states:

- `guest`
- `pending`
- `approved`
- `admin`

Access rules:

- `guest` and `pending` users cannot view prices or use Inquiry features.
- `approved` users can view prices, use the Inquiry List, and submit a Request Quote.
- `admin` users can access administrative catalog and inquiry management features.

## Design Direction

- The customer-facing website should feel like a premium jewelry brand.
- Use `#ff8fa9` as the primary color.
- Use `#2a234f` as the secondary color.
- Keep the interface responsive across mobile, tablet, and desktop layouts.
