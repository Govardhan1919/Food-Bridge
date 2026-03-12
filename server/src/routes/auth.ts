import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = () => process.env.JWT_SECRET || 'secret';

/** Build the public user object returned to the client */
function publicUser(u: Record<string, unknown>) {
    return {
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        role: u.role, verified_badge: u.verified_badge,
        donation_count: u.donation_count, is_online: u.is_online,
        vehicle_type: u.vehicle_type, vehicle_capacity: u.vehicle_capacity,
        ngo_id: u.ngo_id, latitude: u.latitude, longitude: u.longitude,
    };
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res: Response): Promise<void> => {
    const { name, email, phone, password, role, vehicle_capacity, ngo_id, latitude, longitude } = req.body;

    if (!name || !password || !role) {
        res.status(400).json({ error: 'name, password and role are required' }); return;
    }
    if (!email && !phone) {
        res.status(400).json({ error: 'Provide at least email or phone' }); return;
    }
    const validRoles = ['donor', 'ngo', 'rider', 'admin', 'verifier'];
    if (!validRoles.includes(role)) {
        res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` }); return;
    }
    try {
        if (email) {
            const dup = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (dup.rows.length > 0) { res.status(409).json({ error: 'Email already registered' }); return; }
        }
        if (phone) {
            const dup = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
            if (dup.rows.length > 0) { res.status(409).json({ error: 'Phone number already registered' }); return; }
        }

        const password_hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, role, vehicle_capacity, ngo_id, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [name, email ?? null, phone ?? null, password_hash, role,
                vehicle_capacity ?? null, ngo_id ?? null, latitude ?? null, longitude ?? null]
        );
        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET(), { expiresIn: '7d' });
        res.status(201).json({ token, user: publicUser(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /api/auth/login — supports email or phone ───────────────────────────
router.post('/login', async (req, res: Response): Promise<void> => {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
        res.status(400).json({ error: 'Provide (email or phone) and password' }); return;
    }
    try {
        let result;
        if (phone) {
            result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
        } else {
            result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        }
        if (result.rows.length === 0) { res.status(401).json({ error: 'Invalid credentials' }); return; }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET(), { expiresIn: '7d' });
        res.json({ token, user: publicUser(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.userId]);
        if (result.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
        res.json(publicUser(result.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── PATCH /api/auth/change-password ─────────────────────────────────────────
router.patch('/change-password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        res.status(400).json({ error: 'current_password and new_password are required' }); return;
    }
    if (new_password.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' }); return;
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.userId]);
        if (result.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
        const user = result.rows[0];

        const valid = await bcrypt.compare(current_password, user.password_hash);
        if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

        const new_hash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [new_hash, user.id]);
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
