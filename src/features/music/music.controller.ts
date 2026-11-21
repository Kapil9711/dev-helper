import { startMusicServer, type MusicServerOptions } from "./music.server.ts";

export class MusicCommandController {
  async musicDashboard(options: { port?: string; open?: boolean }) {
    const serverOptions: MusicServerOptions = {
      port: options.port ? parseInt(options.port, 10) : 4319,
      open: options.open !== false,
    };
    await startMusicServer(serverOptions);
  }
}

export const musicCommandController = new MusicCommandController();
