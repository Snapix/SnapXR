import { io, Socket } from 'socket.io-client';

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_URL || window.location.origin;

let socket: Socket | null = null;
let hostToken: string | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SIGNALING_SERVER, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['polling', 'websocket'], // Failsafe for cloud proxies
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function setHostToken(token: string | null) {
  hostToken = token;
}

export function getHostToken() {
  return hostToken;
}
