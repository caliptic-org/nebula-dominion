import { io, Socket } from 'socket.io-client'

const GAME_SERVER_URL =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(GAME_SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })
  }
  return socket
}

export function connectSocket(token: string): Socket {
  const s = getSocket()
  s.auth = { token }
  s.connect()
  return s
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
