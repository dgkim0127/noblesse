export const BODY_JEWELRY_GAUGE_SYSTEM = "body-jewelry-gauge";

export const BODY_JEWELRY_GAUGE_PAIRS = Object.freeze([
  { gauge: "20G", mm: "0.8" },
  { gauge: "18G", mm: "1.0" },
  { gauge: "16G", mm: "1.2" },
  { gauge: "14G", mm: "1.6" },
  { gauge: "12G", mm: "2.0" },
  { gauge: "10G", mm: "2.5" },
  { gauge: "8G", mm: "3.2" },
  { gauge: "6G", mm: "4.0" },
  { gauge: "4G", mm: "5.0" },
  { gauge: "2G", mm: "6.0" },
  { gauge: "0G", mm: "8.0" },
  { gauge: "00G", mm: "10.0" }
]);

function normalizeGauge(value) {
  const token = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!token) return "";
  const withSuffix = token.endsWith("G") ? token : `${token}G`;
  return /^(?:00|0|[1-9]\d?)G$/.test(withSuffix) ? withSuffix : token;
}

function normalizeMillimeters(value) {
  const token = String(value || "").trim().toLowerCase().replace(/\s*mm$/, "").replace(",", ".");
  if (!token) return "";
  const numeric = Number(token);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 99) return token;
  return token;
}

export function getGaugePairByGauge(value) {
  const gauge = normalizeGauge(value);
  return BODY_JEWELRY_GAUGE_PAIRS.find((pair) => pair.gauge === gauge) || null;
}

export function getGaugePairByMillimeters(value) {
  const mm = normalizeMillimeters(value);
  const numeric = Number(mm);
  if (!Number.isFinite(numeric)) return null;
  return BODY_JEWELRY_GAUGE_PAIRS.find((pair) => Number(pair.mm) === numeric) || null;
}

export function createGaugeMeasurement(pair, authority = "gauge") {
  if (!pair) return null;
  return {
    system: BODY_JEWELRY_GAUGE_SYSTEM,
    mm: pair.mm,
    gauge: pair.gauge,
    authority: authority === "mm" ? "mm" : "gauge"
  };
}

function measurementFromLabel(label) {
  const text = String(label || "");
  const gaugeMatch = text.match(/(?:^|[\s/])((?:00|0|[1-9]\d?)\s*G)(?:$|[\s/])/i);
  const mmMatch = text.match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  const gaugePair = getGaugePairByGauge(gaugeMatch?.[1]);
  const mmPair = getGaugePairByMillimeters(mmMatch?.[1]);
  if (gaugePair && mmPair && gaugePair.gauge === mmPair.gauge) return createGaugeMeasurement(gaugePair);
  if (gaugePair) return createGaugeMeasurement(gaugePair);
  if (mmPair) return createGaugeMeasurement(mmPair, "mm");
  return null;
}

export function normalizeGaugeMeasurement(value = {}, fallbackLabel = "") {
  const fallback = measurementFromLabel(fallbackLabel);
  const hasMeasurement = value && typeof value === "object" && !Array.isArray(value);
  const hasMm = hasMeasurement && Object.prototype.hasOwnProperty.call(value, "mm");
  const hasGauge = hasMeasurement && Object.prototype.hasOwnProperty.call(value, "gauge");
  return {
    system: BODY_JEWELRY_GAUGE_SYSTEM,
    mm: hasMm ? normalizeMillimeters(value.mm) : fallback?.mm || "",
    gauge: hasGauge ? normalizeGauge(value.gauge) : fallback?.gauge || "",
    authority: hasMeasurement && value.authority === "mm" ? "mm" : fallback?.authority || "gauge"
  };
}

export function isValidGaugeMeasurement(measurement = {}) {
  const normalized = normalizeGaugeMeasurement(measurement);
  const mmPair = getGaugePairByMillimeters(normalized.mm);
  const gaugePair = getGaugePairByGauge(normalized.gauge);
  return Boolean(mmPair && gaugePair && mmPair.gauge === gaugePair.gauge);
}

export function formatGaugeMeasurement(measurement = {}) {
  const normalized = normalizeGaugeMeasurement(measurement);
  const parts = [];
  if (normalized.mm) parts.push(`${normalized.mm}mm`);
  if (normalized.gauge) parts.push(normalized.gauge);
  return parts.join(" / ");
}
