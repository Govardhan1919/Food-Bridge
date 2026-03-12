import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /api/notifications — user's own notifications ───────────────────────
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId } = req.user!;
    try {
        const result = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── PATCH /api/notifications/:id/read — mark a notification read ─────────────
router.patch('/:id/read', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId } = req.user!;
    try {
        await pool.query(
            `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
            [req.params.id, userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── PATCH /api/notifications/read-all — mark all read ────────────────────────
router.patch('/read-all', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId } = req.user!;
    try {
        await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
