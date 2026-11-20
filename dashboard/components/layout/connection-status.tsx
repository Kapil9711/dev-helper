"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket-client";

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    setConnected(socket.connected);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
        connected
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/20 bg-amber-500/10 text-amber-400"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          connected
            ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            : "bg-amber-400"
        }`}
      />
      <span className="hidden sm:inline font-medium">
        {connected ? "Live monitoring" : "Connecting..."}
      </span>
    </div>
  );
}
