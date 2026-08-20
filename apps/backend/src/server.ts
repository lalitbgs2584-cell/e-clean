import { createApp } from "./app";
import { config } from "./config/env";
import { connectRedis } from "./lib/redis";
import { ensureStagingLifecycleRule } from "./services/report-images.service";

const app = createApp();

// Listen on 0.0.0.0 so the server is reachable by any device on the local network (192.168.1.*)
app.listen(config.port, config.host, async () => {
  await connectRedis();
  await ensureStagingLifecycleRule()
    .then(() => console.log("S3 staging lifecycle rule is active."))
    .catch((error) =>
      console.warn(
        "S3 staging lifecycle rule could not be verified. Grant s3:GetLifecycleConfiguration and s3:PutLifecycleConfiguration to enable automatic one-day expiry.",
        error instanceof Error ? error.message : error,
      ),
    );
  console.log(`=========================================`);
  console.log(`🚀 e-clean Backend Server is running!`);
  console.log(`📡 Local URL:   http://localhost:${config.port}`);
  console.log(
    `🌐 Network IP:  http://192.168.1.4:${config.port} (or your machine's LAN IP)`,
  );
  console.log(`🔐 Auth Path:   /api/auth`);
  console.log(`❤️  Health Path: /api/health`);
  console.log(`=========================================`);
});
