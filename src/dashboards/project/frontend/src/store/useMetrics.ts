import { useEffect, useState } from "react";

export function useMetrics() {
  const [data, setData] = useState<any>();

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4545");

    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);

      if (parsed.event === "metrics") {
        setData(parsed.payload);
      }
    };

    return () => ws.close();
  }, []);

  return data;
}
