import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { executeNpiPublication, loadPublicationPlan } from "../jobs/npiPublication.js";

async function main() {
  const mode = process.env.NPI_PUBLICATION_MODE || "verify";
  const apply = process.env.NPI_PUBLICATION_APPLY === "true";
  if ((mode === "verify" && apply) || (mode !== "verify" && !apply)) {
    throw new Error("NPI publication mode/apply guard mismatch");
  }

  const pool = createPool(getEnv());
  if (!pool) throw new Error("NPI publication database pool is unavailable");
  try {
    const plan = await loadPublicationPlan();
    const result = await executeNpiPublication({
      pool,
      plan,
      mode,
      expectedVisibleBefore: process.env.NPI_PUBLICATION_EXPECTED_VISIBLE,
      canaryCode: process.env.NPI_PUBLICATION_CANARY_CODE || "NPI-FDD3353D41"
    });
    console.log(JSON.stringify({ event: "npi_publication_complete", ...result }));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    event: "npi_publication_failed",
    message: error instanceof Error ? error.message : "Unknown publication failure"
  }));
  process.exitCode = 1;
});
