import { pathToFileURL } from "node:url";

export const REQUIRED_ENV = [
  "NOBLESSE_STAGING_E2E_ALLOW",
  "VITE_API_BASE_URL",
  "VITE_FIREBASE_API_KEY",
  "NOBLESSE_STAGING_BUYER_EMAIL",
  "NOBLESSE_STAGING_BUYER_PASSWORD",
  "NOBLESSE_STAGING_ADMIN_EMAIL",
  "NOBLESSE_STAGING_ADMIN_PASSWORD"
];

const FORBIDDEN_BASE_URL_PATTERNS = [
  /noblesse\.web\.app/i,
  /firebaseapp\.com/i,
  /prod/i,
  /production/i
];

const CURRENCY_BY_MARKET = {
  KR: "KRW",
  JP: "JPY",
  US: "USD",
  GLOBAL: "USD"
};

function logStep(label, facts = {}) {
  const entries = Object.entries(facts)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  console.log(`[staging-rc-e2e] ${label}${entries.length ? ` ${entries.join(" ")}` : ""}`);
}

function fail(message, facts = {}) {
  logStep("failed", { reason: message, ...facts });
  process.exitCode = 1;
}

export function validateStagingRcEnv(env = process.env) {
  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  if (env.NOBLESSE_STAGING_E2E_ALLOW !== "YES") {
    throw new Error("NOBLESSE_STAGING_E2E_ALLOW must be YES");
  }

  const baseUrl = env.VITE_API_BASE_URL.trim().replace(/\/+$/, "");
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    throw new Error("VITE_API_BASE_URL must be an absolute staging API URL");
  }
  if (FORBIDDEN_BASE_URL_PATTERNS.some((pattern) => pattern.test(baseUrl))) {
    throw new Error("VITE_API_BASE_URL does not look like a staging API URL");
  }

  return {
    apiBaseUrl: baseUrl,
    firebaseApiKey: env.VITE_FIREBASE_API_KEY.trim(),
    buyerEmail: env.NOBLESSE_STAGING_BUYER_EMAIL,
    buyerPassword: env.NOBLESSE_STAGING_BUYER_PASSWORD,
    adminEmail: env.NOBLESSE_STAGING_ADMIN_EMAIL,
    adminPassword: env.NOBLESSE_STAGING_ADMIN_PASSWORD
  };
}

async function readJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
}

function sanitizeApiError(path, response, body) {
  return {
    path,
    status: response.status,
    code: body?.error?.code || "HTTP_ERROR",
    requestId: body?.error?.requestId || body?.meta?.requestId || response.headers.get("x-request-id") || "none"
  };
}

async function firebaseSignIn({ apiKey, email, password, label }) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );
  const body = await readJson(response);
  if (!response.ok || !body?.idToken) {
    throw new Error(`${label} Firebase sign-in failed`);
  }
  return body.idToken;
}

function createApi({ baseUrl }) {
  return async function apiFetch(path, { method = "GET", token, body } = {}) {
    const headers = new Headers({ accept: "application/json" });
    if (body !== undefined) headers.set("content-type", "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const responseBody = await readJson(response);
    if (!response.ok) {
      const error = sanitizeApiError(path, response, responseBody);
      throw new Error(`API request failed ${JSON.stringify(error)}`);
    }
    return responseBody || {};
  };
}

function unwrapData(body) {
  return body?.data || body || {};
}

function createSyntheticInput() {
  const stamp = Date.now().toString(36).toUpperCase();
  const short = stamp.slice(-8);
  return {
    label: `E2E_33A3_${stamp}`,
    categoryKey: `e2e33a3-${stamp.toLowerCase()}`,
    productCode: `E2E33A3-${short}`,
    productName: `E2E 33A3 Product ${short}`,
    updatedCategoryName: `E2E 33A3 Updated Category ${short}`,
    updatedProductMaterial: `Updated Surgical Steel ${short}`,
    updatedProductName: `E2E 33A3 Updated Product ${short}`
  };
}

function selectBuyerMarket(profile) {
  const market = profile?.assignedMarket || profile?.market || "JP";
  return ["KR", "JP", "US", "GLOBAL"].includes(market) ? market : "GLOBAL";
}

function getId(entity, fieldName = "id") {
  const id = entity?.[fieldName] || entity?.id;
  if (!id) throw new Error(`Expected ${fieldName}`);
  return id;
}

function includesEntity(items, id) {
  return Array.isArray(items) && items.some((item) => item?.id === id || item?.inquiryId === id);
}

async function runCleanup({ api, adminToken, created }) {
  const results = [];
  async function attempt(label, fn) {
    try {
      await fn();
      results.push(`${label}:ok`);
    } catch (error) {
      results.push(`${label}:failed`);
    }
  }

  if (created.quoteId) {
    await attempt("quote-cancel", () => api(`/admin/quotes/${encodeURIComponent(created.quoteId)}/status`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "cancelled" }
    }));
  }
  if (created.inquiryId) {
    await attempt("inquiry-cancel", () => api(`/admin/inquiries/${encodeURIComponent(created.inquiryId)}/status`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "cancelled" }
    }));
  }
  if (created.priceId) {
    await attempt("price-deactivate", () => api(`/admin/prices/${encodeURIComponent(created.priceId)}`, {
      method: "PATCH",
      token: adminToken,
      body: { isActive: false }
    }));
  }
  if (created.productId) {
    await attempt("product-hide", () => api(`/admin/products/${encodeURIComponent(created.productId)}/visibility`, {
      method: "PATCH",
      token: adminToken,
      body: { isVisible: false }
    }));
  }
  if (created.categoryId) {
    await attempt("category-hide", () => api(`/admin/categories/${encodeURIComponent(created.categoryId)}`, {
      method: "PATCH",
      token: adminToken,
      body: { isVisible: false }
    }));
  }

  return results;
}

async function main() {
  const env = validateStagingRcEnv();
  const api = createApi({ baseUrl: env.apiBaseUrl });
  const input = createSyntheticInput();
  const created = {};

  logStep("preflight", { env: "present", baseUrl: "configured", prefix: input.label });

  try {
    const adminToken = await firebaseSignIn({
      apiKey: env.firebaseApiKey,
      email: env.adminEmail,
      password: env.adminPassword,
      label: "admin"
    });
    logStep("admin-sign-in", { ok: "yes" });

    const buyerToken = await firebaseSignIn({
      apiKey: env.firebaseApiKey,
      email: env.buyerEmail,
      password: env.buyerPassword,
      label: "buyer"
    });
    logStep("buyer-sign-in", { ok: "yes" });

    const buyerProfile = await api("/buyer/me", { token: buyerToken });
    const profile = buyerProfile?.profile || buyerProfile?.data?.profile || {};
    const market = selectBuyerMarket(profile);
    const currency = CURRENCY_BY_MARKET[market] || "USD";
    logStep("buyer-profile", { ok: "yes", market });

    const categoryBody = await api("/admin/categories", {
      method: "POST",
      token: adminToken,
      body: {
        categoryId: input.categoryKey,
        nameKo: input.label,
        nameEn: `${input.label} Category`,
        nameJa: input.label,
        slug: input.categoryKey,
        isVisible: true,
        sortOrder: 9999
      }
    });
    const category = unwrapData(categoryBody).category;
    created.categoryId = getId(category);
    logStep("category-create", { ok: "yes" });

    const productBody = await api("/admin/products", {
      method: "POST",
      token: adminToken,
      body: {
        code: input.productCode,
        nameKo: input.productName,
        nameEn: input.productName,
        nameJa: input.productName,
        categoryKey: input.categoryKey,
        material: "Surgical Steel",
        colors: ["Silver"],
        sizes: ["6mm"],
        moqDefault: 20,
        leadTime: "Staging E2E only",
        origin: "KR",
        imageSet: {},
        imageAlt: { en: input.productName },
        isVisible: true,
        isExportAvailable: true,
        sortOrder: 9999,
        descriptionEn: "Synthetic staging E2E catalog product."
      }
    });
    const product = unwrapData(productBody).product;
    created.productId = getId(product);
    logStep("product-create", { ok: "yes", productCode: input.productCode });

    const updatedCategoryBody = await api(`/admin/categories/${encodeURIComponent(created.categoryId)}`, {
      method: "PATCH",
      token: adminToken,
      body: {
        nameEn: input.updatedCategoryName
      }
    });
    const updatedCategory = unwrapData(updatedCategoryBody).category;
    if (updatedCategory?.nameEn !== input.updatedCategoryName) {
      throw new Error("Category update verification failed");
    }
    logStep("category-update", { ok: "yes" });

    const categoryListBody = await api(`/admin/categories?q=${encodeURIComponent(input.categoryKey)}&visible=true&limit=5`, {
      token: adminToken
    });
    const categoryList = unwrapData(categoryListBody).categories || [];
    if (!includesEntity(categoryList, created.categoryId)) {
      throw new Error("Admin category list read-back failed");
    }
    logStep("admin-category-list-readback", { ok: "yes" });

    const updatedProductBody = await api(`/admin/products/${encodeURIComponent(created.productId)}`, {
      method: "PATCH",
      token: adminToken,
      body: {
        nameEn: input.updatedProductName,
        material: input.updatedProductMaterial
      }
    });
    const updatedProduct = unwrapData(updatedProductBody).product;
    if (updatedProduct?.nameEn !== input.updatedProductName || updatedProduct?.material !== input.updatedProductMaterial) {
      throw new Error("Product update verification failed");
    }
    logStep("product-update", { ok: "yes" });

    const productListBody = await api(`/admin/products?q=${encodeURIComponent(input.productCode)}&visible=true&limit=5`, {
      token: adminToken
    });
    const productList = unwrapData(productListBody).products || [];
    if (!includesEntity(productList, created.productId)) {
      throw new Error("Admin product list read-back failed");
    }
    logStep("admin-product-list-readback", { ok: "yes" });

    const priceBody = await api("/admin/prices", {
      method: "POST",
      token: adminToken,
      body: {
        productCode: input.productCode,
        market,
        currency,
        wholesalePrice: 1200,
        moq: 20,
        minOrderAmount: 0,
        isActive: true
      }
    });
    const price = unwrapData(priceBody).price;
    created.priceId = getId(price);
    logStep("price-create", { ok: "yes", market, currency });

    const priceListBody = await api(`/admin/prices?q=${encodeURIComponent(input.productCode)}&market=${encodeURIComponent(market)}&active=true&limit=5`, {
      token: adminToken
    });
    const priceList = unwrapData(priceListBody).prices || [];
    if (!includesEntity(priceList, created.priceId)) {
      throw new Error("Admin price list read-back failed");
    }
    logStep("admin-price-list-readback", { ok: "yes" });

    const catalogProductBody = await api(`/catalog/products/${encodeURIComponent(input.productCode)}`);
    const catalogProduct = catalogProductBody?.product || unwrapData(catalogProductBody).product;
    if (catalogProduct?.code !== input.productCode) {
      throw new Error("Catalog detail read-back failed");
    }
    if (
      catalogProduct.nameEn !== input.updatedProductName
      || catalogProduct.material !== input.updatedProductMaterial
      || catalogProduct.categoryNameEn !== input.updatedCategoryName
    ) {
      throw new Error("Catalog update propagation read-back failed");
    }
    logStep("catalog-readback", { ok: "yes" });

    const catalogListBody = await api("/catalog/products");
    const catalogProducts = catalogListBody?.products || unwrapData(catalogListBody).products || [];
    const catalogListProduct = catalogProducts.find((item) => item?.code === input.productCode);
    if (!catalogListProduct || catalogListProduct.nameEn !== input.updatedProductName) {
      throw new Error("Catalog list read-back failed");
    }
    logStep("catalog-list-readback", { ok: "yes" });

    const productPricesBody = await api("/buyer/product-prices", { token: buyerToken });
    const productPrices = productPricesBody?.productPrices || unwrapData(productPricesBody).productPrices || [];
    const visiblePrice = productPrices.find((item) => item.productCode === input.productCode || item.code === input.productCode);
    if (!visiblePrice) {
      throw new Error("Buyer product price read-back failed");
    }
    logStep("buyer-price-readback", { ok: "yes" });

    const inquiryBody = await api("/buyer/inquiries", {
      method: "POST",
      token: buyerToken,
      body: {
        requestMemo: `${input.label} synthetic inquiry`,
        items: [{
          productCode: input.productCode,
          color: "Silver",
          size: "6mm",
          quantity: 20
        }]
      }
    });
    const inquiry = unwrapData(inquiryBody).inquiry;
    created.inquiryId = getId(inquiry);
    logStep("buyer-inquiry-create", { ok: "yes", status: inquiry?.status || "unknown" });

    const buyerInquiryListBody = await api("/buyer/inquiries?status=requested&limit=5", { token: buyerToken });
    const buyerInquiryList = unwrapData(buyerInquiryListBody).inquiries || [];
    if (!includesEntity(buyerInquiryList, created.inquiryId)) {
      throw new Error("Buyer inquiry list read-back failed");
    }
    logStep("buyer-inquiry-list-readback", { ok: "yes" });

    const adminInquiryBody = await api(`/admin/inquiries/${encodeURIComponent(created.inquiryId)}`, { token: adminToken });
    const adminInquiry = unwrapData(adminInquiryBody).inquiry || unwrapData(adminInquiryBody);
    if (!adminInquiry?.id) {
      throw new Error("Admin inquiry read-back failed");
    }
    logStep("admin-inquiry-readback", { ok: "yes" });

    const adminInquiryListBody = await api(`/admin/inquiries?q=${encodeURIComponent(adminInquiry.inquiryNumber || "")}&market=${encodeURIComponent(market)}&limit=5`, {
      token: adminToken
    });
    const adminInquiryList = unwrapData(adminInquiryListBody).inquiries || [];
    if (!includesEntity(adminInquiryList, created.inquiryId)) {
      throw new Error("Admin inquiry list read-back failed");
    }
    logStep("admin-inquiry-list-readback", { ok: "yes" });

    const statusBody = await api(`/admin/inquiries/${encodeURIComponent(created.inquiryId)}/status`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "quoted" }
    });
    const updatedInquiry = unwrapData(statusBody).inquiry || unwrapData(statusBody);
    logStep("admin-inquiry-status", { ok: "yes", status: updatedInquiry?.status || "quoted" });

    const quoteBody = await api("/admin/quotes", {
      method: "POST",
      token: adminToken,
      body: {
        inquiryId: created.inquiryId,
        leadTime: "Staging E2E",
        shippingNote: "Synthetic staging E2E only",
        adminMemo: input.label
      }
    });
    const quote = unwrapData(quoteBody).quote;
    created.quoteId = getId(quote);
    logStep("admin-quote-create", { ok: "yes", status: quote?.status || "unknown" });

    const adminQuoteListBody = await api(`/admin/quotes?q=${encodeURIComponent(adminInquiry.inquiryNumber || "")}&market=${encodeURIComponent(market)}&limit=5`, {
      token: adminToken
    });
    const adminQuoteList = unwrapData(adminQuoteListBody).quotes || [];
    if (!includesEntity(adminQuoteList, created.quoteId)) {
      throw new Error("Admin quote list read-back failed");
    }
    logStep("admin-quote-list-readback", { ok: "yes" });

    const sentQuoteBody = await api(`/admin/quotes/${encodeURIComponent(created.quoteId)}/status`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "sent" }
    });
    const sentQuote = unwrapData(sentQuoteBody).quote || unwrapData(sentQuoteBody);
    logStep("admin-quote-status", { ok: "yes", status: sentQuote?.status || "sent" });

    const buyerInquiryBody = await api(`/buyer/inquiries/${encodeURIComponent(created.inquiryId)}`, { token: buyerToken });
    const buyerInquiry = unwrapData(buyerInquiryBody).inquiry;
    if (!buyerInquiry?.id) {
      throw new Error("Buyer inquiry read-back failed");
    }
    logStep("buyer-inquiry-readback", { ok: "yes", status: buyerInquiry?.status || "unknown" });

    const cleanup = await runCleanup({ api, adminToken, created });
    logStep("cleanup", { ok: cleanup.every((item) => item.endsWith(":ok")) ? "yes" : "partial", actions: cleanup.join(",") });
    logStep("complete", { result: "STAGING_RC_E2E_GO" });
  } catch (error) {
    logStep("scenario-error", { message: error?.message || "unknown" });
    try {
      if (created.categoryId || created.productId || created.priceId || created.inquiryId || created.quoteId) {
        const adminToken = await firebaseSignIn({
          apiKey: env.firebaseApiKey,
          email: env.adminEmail,
          password: env.adminPassword,
          label: "admin-cleanup"
        });
        const cleanup = await runCleanup({ api, adminToken, created });
        logStep("cleanup-after-error", { actions: cleanup.join(",") || "none" });
      }
    } catch {
      logStep("cleanup-after-error", { actions: "failed" });
    }
    process.exitCode = 1;
  }
}

const isCliRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliRun) {
  main().catch((error) => {
    fail(error?.message || "Unexpected staging E2E failure");
  });
}
