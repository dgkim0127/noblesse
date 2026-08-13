import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { getDetailContentPublishIssues } from "../utils/productDetailContent.js";
import { getEffectiveOptionGroups, getOptionPublishIssues } from "../utils/productOptions.js";

const manifestUrl = new URL("../data/piercing-import-manifest.json", import.meta.url);
const expectedManifestSha256 = "1ade20304ac38e8c93565214ca4344cbf347e8409edee6cc196b4505fe1c047d";
const expectedCounts = Object.freeze({ total: 743, publish: 726, hold: 17 });
const allowedCategoryKeys = new Set(["piercing", "piercing-ring", "earrings", "labret"]);
const categoryDefinitions = Object.freeze({
  piercing: {
    nameKo: "피어싱",
    nameEn: "Piercing",
    nameJa: "ピアス",
    nameZhTw: "冲孔",
    slug: "piercing",
    sortOrder: 10
  },
  "piercing-ring": {
    nameKo: "링 피어싱",
    nameEn: "Piercing Rings",
    nameJa: "リングピアス",
    nameZhTw: "環形穿孔",
    slug: "piercing-ring",
    sortOrder: 20
  },
  earrings: {
    nameKo: "이어링",
    nameEn: "Earrings",
    nameJa: "イヤリング",
    nameZhTw: "耳環",
    slug: "earrings",
    sortOrder: 30
  },
  labret: {
    nameKo: "라블렛",
    nameEn: "Labrets",
    nameJa: "ラブレット",
    nameZhTw: "唇釘",
    slug: "labret",
    sortOrder: 40
  }
});
const expectedHoldCodes = new Set([
  "NPI-BE5816CD0B",
  "NPI-229DE8CE56",
  "NPI-BD0B35D553",
  "NPI-AB339C8387",
  "NPI-C674743A5A",
  "NPI-FE136EF3D7",
  "NPI-E4C7EAD0A9",
  "NPI-E2FB9F203E",
  "NPI-48EA583CC4",
  "NPI-B9FCCFE89C",
  "NPI-4B025E814C",
  "NPI-15A55E1F12",
  "NPI-AFBFB23809",
  "NPI-602E4A6ADB",
  "NPI-19A3E128AB",
  "NPI-8F75749949",
  "NPI-87F2265E3C"
]);

function fail(message) {
  throw new Error(`NPI publication guard failed: ${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeManifestLineEndings(rawBytes) {
  const text = rawBytes.toString("utf8");
  if (text.replaceAll("\r\n", "").includes("\r")) {
    fail("manifest contains unsupported line endings");
  }
  return Buffer.from(text.replaceAll("\r\n", "\n"), "utf8");
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasPrimaryImage(imageSet) {
  return Boolean(imageSet?.primary || imageSet?.detail || imageSet?.card || imageSet?.thumb);
}

function getLocalizedDetailMissing(detailContent) {
  const translations = detailContent?.translations;
  if (!translations || typeof translations !== "object") return [];
  const keys = new Set();
  for (const localized of Object.values(translations)) {
    if (!localized || typeof localized !== "object") continue;
    for (const [key, value] of Object.entries(localized)) {
      if (hasText(value)) keys.add(key);
    }
  }
  const missing = [];
  for (const key of keys) {
    for (const locale of ["kr", "en"]) {
      if (!hasText(translations[locale]?.[key])) missing.push(`${locale}.${key}`);
    }
  }
  return missing;
}

function isSingleExplicitPrice(product) {
  const prices = [...new Set(
    (Array.isArray(product?.priceCandidatesKrw) ? product.priceCandidatesKrw : [])
      .filter((value) => Number.isInteger(value) && value > 0)
  )];
  return prices.length === 1
    && Number.isInteger(product?.baseWholesalePriceKrw)
    && product.baseWholesalePriceKrw === prices[0];
}

function assertExactSet(actualValues, expectedValues, label) {
  const actual = [...actualValues].sort();
  const expected = [...expectedValues].sort();
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    fail(`${label} set mismatch`);
  }
}

export function validatePublicationManifest(rawManifest, rawBytes) {
  if (sha256(normalizeManifestLineEndings(rawBytes)) !== expectedManifestSha256) fail("manifest SHA-256 mismatch");
  if (rawManifest?.schemaVersion !== 1) fail("unsupported manifest schema");
  if (rawManifest?.policy?.uploadAsDraft !== true || rawManifest?.policy?.publishAutomatically !== false) {
    fail("unsafe source manifest policy");
  }
  if (!Array.isArray(rawManifest.records) || rawManifest.records.length !== expectedCounts.total) {
    fail("unexpected source record count");
  }

  const seen = new Set();
  const publish = [];
  const hold = [];
  for (const record of rawManifest.records) {
    const product = record?.proposedProduct;
    const code = product?.code;
    if (!/^NPI-[A-F0-9]{10}$/.test(code || "")) fail("invalid product code");
    if (seen.has(code)) fail("duplicate product code");
    seen.add(code);
    if (!allowedCategoryKeys.has(product.categoryHint)) fail(`unsupported category hint for ${code}`);

    if (isSingleExplicitPrice(product)) {
      publish.push({
        code,
        categoryKey: product.categoryHint,
        wholesalePriceKrw: product.baseWholesalePriceKrw
      });
    } else {
      hold.push({ code });
    }
  }

  if (publish.length !== expectedCounts.publish || hold.length !== expectedCounts.hold) {
    fail("unexpected publish/hold classification counts");
  }
  assertExactSet(hold.map((item) => item.code), expectedHoldCodes, "hold code");

  return {
    manifestSha256: expectedManifestSha256,
    total: expectedCounts.total,
    publish: publish.sort((a, b) => a.code.localeCompare(b.code)),
    hold: hold.sort((a, b) => a.code.localeCompare(b.code))
  };
}

export async function loadPublicationPlan() {
  const rawBytes = await readFile(manifestUrl);
  return validatePublicationManifest(JSON.parse(rawBytes.toString("utf8")), rawBytes);
}

function snapshot(row) {
  return {
    code: row.code,
    nameEn: row.name_en || null,
    categoryKey: row.category_key || null,
    isVisible: Boolean(row.is_visible)
  };
}

async function querySnapshot(client) {
  const productResult = await client.query(`
    select
      p.id::text,
      p.code,
      p.name_ko,
      p.name_en,
      p.category_id::text,
      c.category_id as category_key,
      p.image_set,
      p.colors,
      p.sizes,
      p.specs,
      p.option_groups,
      p.detail_content,
      p.is_visible,
      pp.market as kr_market,
      pp.currency as kr_currency,
      pp.wholesale_price::text as kr_wholesale_price,
      pp.is_active as kr_is_active
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join public.product_prices pp on pp.product_id = p.id and pp.market = 'KR'
    where p.code like 'NPI-%'
    order by p.code
    for update of p
  `);
  return productResult.rows;
}

function verifySnapshot(rows, plan, categories, expectedVisibleBefore) {
  const planByCode = new Map(plan.publish.map((item) => [item.code, item]));
  const holdCodes = new Set(plan.hold.map((item) => item.code));
  assertExactSet(rows.map((row) => row.code), [...planByCode.keys(), ...holdCodes], "database product code");

  let visiblePublish = 0;
  let visibleHold = 0;
  for (const row of rows) {
    const desired = planByCode.get(row.code);
    if (!desired) {
      if (!holdCodes.has(row.code)) fail("database contains an unknown NPI product");
      if (row.is_visible) visibleHold += 1;
      if (row.kr_is_active) fail(`hold product has an active KR price: ${row.code}`);
      continue;
    }

    if (!hasText(row.name_ko)) fail(`missing Korean name: ${row.code}`);
    if (!hasPrimaryImage(row.image_set)) fail(`missing primary image: ${row.code}`);
    const optionIssues = getOptionPublishIssues(getEffectiveOptionGroups(row), row.image_set || {});
    const detailIssues = [
      ...getLocalizedDetailMissing(row.detail_content || {}),
      ...getDetailContentPublishIssues(row.detail_content || {}, row.image_set || {})
    ];
    if (optionIssues.length > 0 || detailIssues.length > 0) {
      fail(`option or detail content is not publishable: ${row.code}`);
    }
    if (row.kr_market !== "KR" || row.kr_currency !== "KRW" || row.kr_is_active !== true) {
      fail(`missing active KR/KRW price: ${row.code}`);
    }
    if (Number(row.kr_wholesale_price) !== desired.wholesalePriceKrw) {
      fail(`KR price mismatch: ${row.code}`);
    }
    if (categories && !categories.has(desired.categoryKey)) {
      fail(`missing visible category: ${desired.categoryKey}`);
    }
    if (row.is_visible) visiblePublish += 1;
  }

  if (visibleHold !== 0) fail("one or more held products are visible");
  if (expectedVisibleBefore !== undefined && visiblePublish !== expectedVisibleBefore) {
    fail(`expected ${expectedVisibleBefore} visible publish products, found ${visiblePublish}`);
  }
  return { visiblePublish, visibleHold };
}

function categorySnapshot(row) {
  if (!row) return null;
  return {
    categoryId: row.category_id,
    isVisible: Boolean(row.is_visible),
    nameKo: row.name_ko || null,
    nameEn: row.name_en || null,
    slug: row.slug || null
  };
}

async function queryCategories(client, categoryKeys) {
  return client.query(
    `
      select
        id::text,
        category_id,
        name_ko,
        name_en,
        name_ja,
        name_zh_tw,
        slug,
        is_visible,
        sort_order
      from public.categories
      where category_id = any($1::text[])
      order by category_id
    `,
    [categoryKeys]
  );
}

async function insertAuditRows(client, { action, targetTable, rows, requestId }) {
  if (rows.length === 0) return;
  await client.query(`
    insert into public.audit_logs (
      actor_user_id, actor_role, action, target_table, target_id,
      before_snapshot, after_snapshot, request_id, ip_address, user_agent
    )
    select
      null, 'system', $4, $5, u.id,
      u.before_snapshot, u.after_snapshot,
      $6, null, 'noblesse-npi-publication-job'
    from unnest($1::text[], $2::jsonb[], $3::jsonb[])
      as u(id, before_snapshot, after_snapshot)
  `, [
    rows.map((item) => item.id),
    rows.map((item) => JSON.stringify(item.before)),
    rows.map((item) => JSON.stringify(item.after)),
    action,
    targetTable,
    requestId
  ]);
}

async function ensurePublicationCategories(client, categoryKeys, existingRows, mode) {
  const beforeByKey = new Map(existingRows.map((row) => [row.category_id, row]));
  const changedKeys = categoryKeys.filter((key) => !beforeByKey.get(key)?.is_visible);
  if (changedKeys.length === 0) {
    return new Map(existingRows.map((row) => [row.category_id, row.id]));
  }

  for (const key of changedKeys) {
    const definition = categoryDefinitions[key];
    await client.query(`
      insert into public.categories (
        category_id, name_ko, name_en, name_ja, name_zh_tw,
        slug, is_visible, sort_order
      )
      values ($1, $2, $3, $4, $5, $6, true, $7)
      on conflict (category_id) do update
      set is_visible = true,
          updated_at = now()
    `, [
      key,
      definition.nameKo,
      definition.nameEn,
      definition.nameJa,
      definition.nameZhTw,
      definition.slug,
      definition.sortOrder
    ]);
  }

  const afterResult = await queryCategories(client, categoryKeys);
  const afterByKey = new Map(afterResult.rows.map((row) => [row.category_id, row]));
  const categories = new Map(
    afterResult.rows.filter((row) => row.is_visible).map((row) => [row.category_id, row.id])
  );
  assertExactSet(categories.keys(), categoryKeys, "visible category");
  await insertAuditRows(client, {
    action: "admin.category.import.prepare",
    targetTable: "categories",
    requestId: `npi-publication-20260811-${mode}`,
    rows: changedKeys.map((key) => ({
      id: afterByKey.get(key).id,
      before: categorySnapshot(beforeByKey.get(key)),
      after: categorySnapshot(afterByKey.get(key))
    }))
  });
  return categories;
}

function parseExpectedVisible(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > expectedCounts.publish) {
    fail("invalid expected visible count");
  }
  return parsed;
}

export async function executeNpiPublication({
  pool,
  plan,
  mode = "verify",
  expectedVisibleBefore,
  canaryCode = "NPI-FDD3353D41"
}) {
  if (!pool?.connect) fail("transactional database pool is required");
  if (!new Set(["verify", "canary", "full"]).has(mode)) fail("invalid publication mode");
  const expectedVisible = parseExpectedVisible(expectedVisibleBefore);
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("set transaction isolation level serializable");
    await client.query("select pg_advisory_xact_lock(hashtext('noblesse-npi-publication-20260811'))");

    const categoryKeys = [...new Set(plan.publish.map((item) => item.categoryKey))];
    const categoryResult = await queryCategories(client, categoryKeys);
    let categories = new Map(
      categoryResult.rows.filter((row) => row.is_visible).map((row) => [row.category_id, row.id])
    );
    const beforeRows = await querySnapshot(client);
    const before = verifySnapshot(beforeRows, plan, null, expectedVisible);
    const missingVisibleCategories = categoryKeys.filter((key) => !categories.has(key)).sort();
    if (mode === "verify") {
      await client.query("rollback");
      return {
        mode,
        total: beforeRows.length,
        publish: plan.publish.length,
        hold: plan.hold.length,
        visiblePublish: before.visiblePublish,
        visibleHold: before.visibleHold,
        missingVisibleCategories,
        changed: 0,
        committed: false
      };
    }

    categories = await ensurePublicationCategories(
      client,
      categoryKeys,
      categoryResult.rows,
      mode
    );
    verifySnapshot(beforeRows, plan, categories, expectedVisible);

    const targetPlan = mode === "canary"
      ? plan.publish.filter((item) => item.code === canaryCode)
      : plan.publish;
    if (targetPlan.length !== (mode === "canary" ? 1 : expectedCounts.publish)) {
      fail("canary or full target set mismatch");
    }
    const beforeByCode = new Map(beforeRows.map((row) => [row.code, row]));
    const changedPlan = targetPlan.filter((item) => {
      const row = beforeByCode.get(item.code);
      return !row.is_visible || !hasText(row.name_en) || row.category_key !== item.categoryKey;
    });

    if (changedPlan.length > 0) {
      const codes = changedPlan.map((item) => item.code);
      const desiredCategories = changedPlan.map((item) => item.categoryKey);
      await client.query(`
        with desired(code, category_key) as (
          select * from unnest($1::text[], $2::text[])
        )
        update public.products p
        set
          name_en = coalesce(nullif(btrim(p.name_en), ''), p.name_ko),
          category_id = c.id,
          is_visible = true
        from desired d
        join public.categories c on c.category_id = d.category_key and c.is_visible = true
        where p.code = d.code
      `, [codes, desiredCategories]);
    }

    const afterRows = await querySnapshot(client);
    const afterByCode = new Map(afterRows.map((row) => [row.code, row]));
    for (const item of targetPlan) {
      const row = afterByCode.get(item.code);
      if (!row?.is_visible || !hasText(row.name_en) || row.category_key !== item.categoryKey) {
        fail(`post-update publication state mismatch: ${item.code}`);
      }
    }
    for (const item of plan.hold) {
      if (afterByCode.get(item.code)?.is_visible) fail(`held product became visible: ${item.code}`);
    }

    if (changedPlan.length > 0) {
      const ids = [];
      const beforeSnapshots = [];
      const afterSnapshots = [];
      for (const item of changedPlan) {
        ids.push(afterByCode.get(item.code).id);
        beforeSnapshots.push(JSON.stringify(snapshot(beforeByCode.get(item.code))));
        afterSnapshots.push(JSON.stringify(snapshot(afterByCode.get(item.code))));
      }
      await insertAuditRows(client, {
        action: "admin.product.import.publish",
        targetTable: "products",
        requestId: `npi-publication-20260811-${mode}`,
        rows: ids.map((id, index) => ({
          id,
          before: JSON.parse(beforeSnapshots[index]),
          after: JSON.parse(afterSnapshots[index])
        }))
      });
    }

    const expectedAfter = mode === "canary" ? 1 : expectedCounts.publish;
    const after = verifySnapshot(afterRows, plan, categories, expectedAfter);
    await client.query("commit");
    return {
      mode,
      total: afterRows.length,
      publish: plan.publish.length,
      hold: plan.hold.length,
      visiblePublish: after.visiblePublish,
      visibleHold: after.visibleHold,
      changed: changedPlan.length,
      committed: true
    };
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

export const publicationExpectations = expectedCounts;
