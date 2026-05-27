import { io } from 'socket.io-client';

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ?? 'http://localhost:3000';

export const socket = io(`${WS_URL}/events`, {
  autoConnect: false,
  withCredentials: true,
});

export function connectSocket(token: string): void {
  socket.auth = { token };
  if (!socket.connected) socket.connect();
}

export function disconnectSocket(): void {
  socket.disconnect();
}
