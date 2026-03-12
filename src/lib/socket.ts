import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';

const SOCKET_URL = 'http://localhost:3001';

let socketInstance: Socket | null = null;

export function getSocket(userId: number): Socket {
    if (!socketInstance || !socketInstance.connected) {
        socketInstance = io(SOCKET_URL, {
            query: { userId: String(userId) },
            transports: ['websocket'],
            autoConnect: true,
        });
    }
    return socketInstance;
}

export function disconnectSocket() {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}

/** React hook: connect socket on mount, auto-disconnect on unmount.
 *  Optionally subscribe to events via `listeners` map.
 */
export function useSocket(
    userId: number | undefined,
    listeners?: Record<string, (data: unknown) => void>
) {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!userId) return;
        const socket = getSocket(userId);
        socketRef.current = socket;

        if (listeners) {
            Object.entries(listeners).forEach(([event, handler]) => {
                socket.on(event, handler);
            });
        }

        return () => {
            if (listeners) {
                Object.entries(listeners).forEach(([event, handler]) => {
                    socket.off(event, handler);
                });
            }
        };
    }, [userId]);

    return socketRef;
}
