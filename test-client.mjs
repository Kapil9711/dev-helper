import { createVH } from "./dist/node/index.js";

const vh = createVH({
  appName: "vh-test-app",
  serverUrl: "http://localhost:4317",
  showConsoleOnLog: true,
});

vh.log.info("Hello from vh-dev-client", {
  environment: "development",
});

vh.network.req({
  requestId: "req-001",
  method: "GET",
  url: "/api/products",
});

vh.network.res({
  requestId: "req-001",
  status: 200,
  durationMs: 124,
});

try {
  await vh.flush();
  console.log("Flush completed");
} catch (error) {
  console.error("Flush failed:", error);
} finally {
  await vh.destroy();
}
