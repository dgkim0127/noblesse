import { createApp } from "./app.js";
import { assertProductionConfig, getEnv } from "./config/env.js";

try {
  const env = getEnv();
  assertProductionConfig(env);

  const app = createApp({ env });
  app.listen(env.port, () => {
    console.log(`noblesse-backend listening on port ${env.port}`);
  });
} catch (error) {
  console.error("Unable to start noblesse-backend", {
    message: error.message
  });
  process.exit(1);
}
