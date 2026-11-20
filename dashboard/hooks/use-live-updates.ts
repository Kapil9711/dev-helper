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
      void queryClient.invalidateQueries({
        queryKey: ["apps"],
      });
    };

    const handleNewNetworkRequests = () => {
      void queryClient.invalidateQueries({
        queryKey: ["network-requests"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["network-request-details"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["apps"],
      });
    };

    const handleConnect = () => {
      void queryClient.invalidateQueries({
        queryKey: ["logs"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["network-requests"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["network-request-details"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["apps"],
      });
    };

    socket.on("connect", handleConnect);
    socket.on("vh:logs:new", handleNewLogs);
    socket.on("vh:network:new", handleNewNetworkRequests);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("vh:logs:new", handleNewLogs);
      socket.off("vh:network:new", handleNewNetworkRequests);
    };
  }, [queryClient]);
}
