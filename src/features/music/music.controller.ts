import { startMusicServer, type MusicServerOptions } from "./music.server.ts";

export class MusicCommandController {
  async musicDashboard(options: { port?: string; open?: boolean; group?: boolean }) {
    const serverOptions: MusicServerOptions = {
      port: options.port ? parseInt(options.port, 10) : 4319,
      open: options.open !== false,
      group: !!options.group,
    };
    await startMusicServer(serverOptions);
  }
}

export const musicCommandController = new MusicCommandController();
