import { io } from "socket.io-client";

const socket = io("http://localhost:4317");

socket.on("connect", () => {
  console.log("Connected to VH log server:", socket.id);
});

socket.on("vh:logs:new", (payload) => {
  console.log("New logs notification:", payload);
});

socket.on("vh:network:new", (payload) => {
  console.log("New network notification:", payload);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection failed:", error.message);
});
