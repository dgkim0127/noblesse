export const FX_REQUIRED_CURRENCIES = Object.freeze(["KRW", "JPY", "USD", "TWD"]);

export function getFxRuntimeMetadata(env = process.env) {
  return {
    jobName: env.CLOUD_RUN_JOB || env.K_SERVICE || null,
    executionId: env.CLOUD_RUN_EXECUTION || env.K_REVISION || null
  };
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function calculateSourceAgeSeconds(sourceEffectiveAt, now = () => new Date()) {
  const sourceDate = new Date(sourceEffectiveAt);
  const nowDate = typeof now === "function" ? now() : new Date(now);
  if (Number.isNaN(sourceDate.getTime()) || Number.isNaN(nowDate.getTime())) return null;
  return Math.max(0, Math.floor((nowDate.getTime() - sourceDate.getTime()) / 1000));
}

export function createFxProviderResultLog(snapshot = {}, {
  mode,
  providerRequestCount,
  env = process.env,
  now = () => new Date(),
  dbInitialized = null
} = {}) {
  const rates = snapshot.rates || {};
  const presentCurrencies = FX_REQUIRED_CURRENCIES.filter((currency) => rates[currency]);
  const rateDirectionValid = FX_REQUIRED_CURRENCIES.every((currency) => {
    const rate = rates[currency];
    return rate?.currency === currency && Number.isFinite(Number(rate.krwPerUnit)) && Number(rate.krwPerUnit) > 0;
  });

  return {
    event: "fx_provider_result",
    provider: snapshot.provider || "unknown",
    mode,
    providerRequestCount,
    baseCurrency: snapshot.baseCurrency || "KRW",
    requiredCurrencies: [...FX_REQUIRED_CURRENCIES],
    sourceEffectiveAt: toIsoOrNull(snapshot.sourceEffectiveAt),
    fetchedAt: toIsoOrNull(snapshot.fetchedAt),
    sourceAgeSeconds: calculateSourceAgeSeconds(snapshot.sourceEffectiveAt, now),
    timestampValidation: snapshot.sourceEffectiveAt && snapshot.fetchedAt ? "passed" : "failed",
    completenessValidation: presentCurrencies.length === FX_REQUIRED_CURRENCIES.length ? "passed" : "failed",
    rateDirectionValidation: rateDirectionValid ? "passed" : "failed",
    ...getFxRuntimeMetadata(env),
    dbInitialized
  };
}

export function buildTerminalCounters(input = {}) {
  const counters = {
    evaluated: Number(input.evaluated ?? input.evaluatedCount ?? 0),
    created: Number(input.created ?? input.createdCount ?? 0),
    updated: Number(input.updated ?? input.updatedCount ?? 0),
    held: Number(input.held ?? input.heldCount ?? 0),
    blocked: Number(input.blocked ?? input.blockedCount ?? 0),
    skipped: Number(input.skipped ?? input.skippedCount ?? 0),
    noop: Number(input.noop ?? input.noopCount ?? 0),
    legacyExcluded: Number(input.legacyExcluded ?? input.legacyExcludedCount ?? 0),
    error: Number(input.error ?? input.errorCount ?? 0)
  };
  const aggregateSum = counters.created +
    counters.updated +
    counters.held +
    counters.blocked +
    counters.skipped +
    counters.noop +
    counters.legacyExcluded +
    counters.error;

  return {
    ...counters,
    aggregateSum,
    aggregateMatchesEvaluated: counters.evaluated === aggregateSum
  };
}

export function buildTerminalCountersFromRun(run = {}) {
  const known = Number(run.createdCount ?? 0) +
    Number(run.updatedCount ?? 0) +
    Number(run.heldCount ?? 0) +
    Number(run.blockedCount ?? 0) +
    Number(run.errorCount ?? 0);
  const evaluated = Number(run.evaluatedCount ?? 0);
  return buildTerminalCounters({
    evaluated,
    created: run.createdCount,
    updated: run.updatedCount,
    held: run.heldCount,
    blocked: run.blockedCount,
    skipped: Math.max(0, evaluated - known),
    noop: 0,
    legacyExcluded: 0,
    error: run.errorCount
  });
}

export function createFxEvaluationSummaryLog(result = {}, { env = process.env } = {}) {
  const terminalCounters = result.terminalCounters || buildTerminalCountersFromRun(result.run || {});
  return {
    event: "fx_evaluation_summary",
    ...getFxRuntimeMetadata(env),
    evaluated: terminalCounters.evaluated,
    created: terminalCounters.created,
    updated: terminalCounters.updated,
    held: terminalCounters.held,
    blocked: terminalCounters.blocked,
    skipped: terminalCounters.skipped,
    noop: terminalCounters.noop,
    legacyExcluded: terminalCounters.legacyExcluded,
    error: terminalCounters.error,
    aggregateSum: terminalCounters.aggregateSum,
    aggregateMatchesEvaluated: terminalCounters.aggregateMatchesEvaluated,
    manualChanged: Number(result.manualChanged ?? 0),
    legacyCnCnyChanged: Number(result.legacyCnCnyChanged ?? 0),
    ownershipMismatchChanged: Number(result.ownershipMismatchChanged ?? 0),
    unexpectedMutations: Number(result.unexpectedMutations ?? 0),
    runCreated: Boolean(result.runCreated ?? result.run?.id),
    auditLogIdReturned: Boolean(result.auditLogId ?? result.auditLogIdReturned)
  };
}
