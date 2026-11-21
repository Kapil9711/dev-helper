import { Command } from "commander";
import { musicCommandController } from "./music.controller.ts";

class MusicCommandRouter {
  private music!: Command;

  register(program: Command) {
    this.music = program
      .command("music")
      .description("Start the VH Music Player Dashboard and audio server")
      .option("-p, --port <port>", "Port to listen on", "4319")
      .option("--no-open", "Do not open browser automatically")
      .action(async (options: { port?: string; open?: boolean }) => {
        await musicCommandController.musicDashboard(options);
      });

    this.musicDashboard();
    this.musicServe();
  }

  private musicDashboard() {
    this.music
      .command("dashboard")
      .description("Launch the standalone Music Dashboard")
      .option("-p, --port <port>", "Port to listen on", "4319")
      .option("--no-open", "Do not open browser automatically")
      .action(async (options: { port?: string; open?: boolean }) => {
        await musicCommandController.musicDashboard(options);
      });
  }

  private musicServe() {
    this.music
      .command("serve")
      .description("Serve the Music Dashboard server")
      .option("-p, --port <port>", "Port to listen on", "4319")
      .option("--no-open", "Do not open browser automatically")
      .action(async (options: { port?: string; open?: boolean }) => {
        await musicCommandController.musicDashboard(options);
      });
  }
}

export const musicCommandRouter = new MusicCommandRouter();
