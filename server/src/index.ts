import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import authRoutes from './routes/auth';
import donationRoutes from './routes/donations';
import pickupRoutes from './routes/pickups';
import statsRoutes from './routes/stats';
import verificationRoutes from './routes/verification';
import riderRoutes from './routes/riders';
import ngoRoutes from './routes/ngos';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ── Socket.IO ────────────────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
    cors: { origin: 'http://localhost:5173', credentials: true },
});

// Track connected users: userId → socketId
const userSockets = new Map<number, string>();

io.on('connection', (socket) => {
    const userId = Number(socket.handshake.query.userId);
    if (userId) {
        userSockets.set(userId, socket.id);
        console.log(`🔌 User ${userId} connected: ${socket.id}`);
    }
    socket.on('disconnect', () => {
        userSockets.delete(userId);
        console.log(`🔌 User ${userId} disconnected`);
    });
});

/** Emit an event to a specific user by their DB userId */
export function emitToUser(userId: number, event: string, payload: unknown) {
    const socketId = userSockets.get(userId);
    if (socketId) {
        io.to(socketId).emit(event, payload);
    }
}

/** Emit an event to multiple users */
export function emitToUsers(userIds: number[], event: string, payload: unknown) {
    userIds.forEach((id) => emitToUser(id, event, payload));
}

// ── Express Middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'FoodBridge API running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

httpServer.listen(PORT, () => {
    console.log(`🚀 FoodBridge server running at http://localhost:${PORT}`);
});

export default app;
