import { createApp } from "./app";
import { config } from "./config/env";
import { connectRedis } from "./lib/redis";

const app = createApp();

// Listen on 0.0.0.0 so the server is reachable by any device on the local network (192.168.1.*)
app.listen(config.port, config.host, async () => {
  await connectRedis();
  console.log(`=========================================`);
  console.log(`🚀 e-clean Backend Server is running!`);
  console.log(`📡 Local URL:   http://localhost:${config.port}`);
  console.log(`🌐 Network IP:  http://192.168.1.4:${config.port} (or your machine's LAN IP)`);
  console.log(`🔐 Auth Path:   /api/auth`);
  console.log(`❤️  Health Path: /api/health`);
  console.log(`=========================================`);
});
