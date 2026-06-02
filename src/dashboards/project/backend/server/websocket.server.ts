import { Server } from "http";

import { WebSocketServer } from "ws";

class WebsocketServer {
  private wss?: WebSocketServer;

  attach(server: Server) {
    this.wss = new WebSocketServer({
      server,
    });

    this.wss.on(
      "connection",

      () => {
        console.log("Dashboard connected");
      },
    );
  }

  emit(
    event: string,

    payload: unknown,
  ) {
    if (!this.wss) {
      return;
    }

    const message = JSON.stringify({
      event,

      payload,
    });

    this.wss.clients.forEach((client) => {
      client.send(message);
    });
  }
}

export const websocketServer = new WebsocketServer();
