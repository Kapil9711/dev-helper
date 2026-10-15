"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket-client";
import { queryKeys } from "@/lib/queries";

export function useLiveUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const handleNewLogs = () => {
      void queryClient.invalidateQueries({
        queryKey: ["logs"],
      });
    };

    const handleNewNetworkRequests = () => {
      void queryClient.invalidateQueries({
        queryKey: ["network-requests"],
      });
    };

    socket.on("vh:logs:new", handleNewLogs);
    socket.on("vh:network:new", handleNewNetworkRequests);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("vh:logs:new", handleNewLogs);
      socket.off("vh:network:new", handleNewNetworkRequests);
    };
  }, [queryClient]);
}
