import { connectRedis } from "./lib/redis";
import { startAIWorker } from "./workers/ai.workers";

async function main() {
  console.log("=========================================");
  console.log("⚙️  Starting e-clean Background Worker...");
  console.log("=========================================");
  await connectRedis();
  await startAIWorker();
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
