// src/utils/socketClient.js
import { io } from "socket.io-client";

const API = "http://localhost:4000";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      // console.debug("[socket] connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      // console.debug("[socket] disconnected:", reason);
    });
  }
  return socket;
}

/** Une el socket al room del usuario (idempotente). */
export function joinUserRoom(user) {
  const s = getSocket();
  const userId = user?._id || user?.id;
  if (!userId) return;

  const doJoin = () => s.emit("notifications:join", { userId });

  if (s.connected) doJoin();
  else s.once("connect", doJoin);
}
