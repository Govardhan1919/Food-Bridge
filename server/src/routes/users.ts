import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /api/users/donors — admin sees all donors ───────────────────────────
router.get('/donors', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
    try {
        const result = await pool.query(
            `SELECT id, name, email, phone, verified_badge, donation_count, created_at 
             FROM users 
             WHERE role = 'donor' 
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
