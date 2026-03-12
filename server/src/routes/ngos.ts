import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /api/ngos — list all NGOs with rider count ──────────────────────────
router.get('/', authMiddleware, async (_req, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, u.phone, u.latitude, u.longitude, u.created_at,
                    COUNT(r.id) FILTER (WHERE r.role = 'rider') AS rider_count,
                    COUNT(d.id) AS donation_count
             FROM users u
             LEFT JOIN users r ON r.ngo_id = u.id AND r.role = 'rider'
             LEFT JOIN donations d ON d.ngo_id = u.id
             WHERE u.role = 'ngo'
             GROUP BY u.id ORDER BY u.name`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/ngos/:id/riders — all riders under a specific NGO (admin only) ──
router.get('/:id/riders', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { role } = req.user!;
    if (role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
    try {
        const result = await pool.query(
            `SELECT id, name, email, phone, is_online, vehicle_type, vehicle_capacity,
                    aadhaar_no, vehicle_no, address, driving_licence_no, created_at
             FROM users WHERE role = 'rider' AND ngo_id = $1 ORDER BY name`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/ngos/:id — NGO profile ────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, latitude, longitude FROM users WHERE id = $1 AND role = 'ngo'`,
            [req.params.id]
        );
        if (result.rows.length === 0) { res.status(404).json({ error: 'NGO not found' }); return; }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── PATCH /api/ngos/location — NGO updates their own location ────────────────
router.patch('/location', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'ngo') { res.status(403).json({ error: 'NGO only' }); return; }
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) { res.status(400).json({ error: 'latitude and longitude required' }); return; }
    try {
        await pool.query(
            `UPDATE users SET latitude = $1, longitude = $2 WHERE id = $3`, [latitude, longitude, userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;

