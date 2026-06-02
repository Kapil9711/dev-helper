import express from "express";
import http from "http";

class DashboardServer {
  async start() {
    const app = express();

    app.get(
      "/health",

      (_req, res) => {
        res.send("dashboard alive");
      },
    );

    const server = http.createServer(app);

    await new Promise((resolve) => {
      server.listen(
        4545,

        () => {
          console.log("Dashboard API : http://localhost:4545");

          resolve(true);
        },
      );
    });

    return server;
  }
}

export const dashboardServer = new DashboardServer();
