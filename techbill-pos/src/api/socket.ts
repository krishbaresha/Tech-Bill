import { io } from 'socket.io-client';

export function getWsUrl(): string {
  const envWs = import.meta.env.VITE_WS_URL as string | undefined;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
    if (!isLocalhost) {
      if (envWs && (envWs.startsWith('https://') || envWs.startsWith('wss://'))) {
        return envWs;
      }
      return 'https://api.techbill.app';
    }
  }
  return envWs || 'http://localhost:3000';
}

export const socket = io(`${getWsUrl()}/events`, {
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
