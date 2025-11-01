import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_BASE_URL;

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
  }
  return socket;
}

// Une el socket al room del usuario
export function joinUserRoom(user) {
  const s = getSocket();
  const userId = user?._id || user?.id;
  if (!userId) return;

  const doJoin = () => s.emit("notifications:join", { userId });

  if (s.connected) doJoin();
  else s.once("connect", doJoin);
}
