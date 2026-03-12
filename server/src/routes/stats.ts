import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/stats — aggregate stats based on caller's role
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    try {
        if (role === 'donor') {
            const total = await pool.query('SELECT COUNT(*) FROM donations WHERE donor_id = $1', [userId]);
            const completed = await pool.query("SELECT COUNT(*) FROM donations WHERE donor_id = $1 AND status = 'delivered'", [userId]);
            const pending = await pool.query("SELECT COUNT(*) FROM donations WHERE donor_id = $1 AND status = 'available'", [userId]);
            const meals = await pool.query("SELECT COUNT(*) * 5 as meals FROM donations WHERE donor_id = $1 AND status = 'delivered'", [userId]);
            res.json({
                totalDonations: parseInt(total.rows[0].count),
                completed: parseInt(completed.rows[0].count),
                pending: parseInt(pending.rows[0].count),
                mealsSaved: parseInt(meals.rows[0].meals),
            });
        } else if (role === 'ngo') {
            const available = await pool.query("SELECT COUNT(*) FROM donations WHERE status = 'available'");
            const accepted = await pool.query("SELECT COUNT(*) FROM donations WHERE status = 'accepted' AND ngo_id = $1", [userId]);
            const inTransit = await pool.query("SELECT COUNT(*) FROM donations WHERE status = 'picked_up' AND ngo_id = $1", [userId]);
            const riders = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'rider' AND is_online = true AND ngo_id = $1", [userId]);
            res.json({
                available: parseInt(available.rows[0].count),
                accepted: parseInt(accepted.rows[0].count),
                inTransit: parseInt(inTransit.rows[0].count),
                activeVolunteers: parseInt(riders.rows[0].count),
            });
        } else if (role === 'rider') {
            const active = await pool.query("SELECT COUNT(*) FROM pickups WHERE rider_id = $1 AND status = 'in_progress'", [userId]);
            const completed = await pool.query("SELECT COUNT(*) FROM pickups WHERE rider_id = $1 AND status = 'completed'", [userId]);
            const total = await pool.query('SELECT COUNT(*) FROM pickups WHERE rider_id = $1', [userId]);
            res.json({
                activePickups: parseInt(active.rows[0].count),
                completed: parseInt(completed.rows[0].count),
                totalPickups: parseInt(total.rows[0].count),
            });
        } else if (role === 'admin') {
            const users = await pool.query('SELECT COUNT(*) FROM users');
            const donations = await pool.query('SELECT COUNT(*) FROM donations');
            const meals = await pool.query("SELECT COUNT(*) * 5 as meals FROM donations WHERE status = 'delivered'");
            const pending = await pool.query("SELECT COUNT(*) FROM verification_calls WHERE status = 'pending'");
            // Monthly donations for chart
            const monthly = await pool.query(`
        SELECT TO_CHAR(created_at, 'Mon') as month, COUNT(*) as donations
        FROM donations
        WHERE created_at > NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `);
            // Role distribution
            const roles = await pool.query("SELECT role, COUNT(*) as value FROM users GROUP BY role");
            res.json({
                totalUsers: parseInt(users.rows[0].count),
                totalDonations: parseInt(donations.rows[0].count),
                mealsSaved: parseInt(meals.rows[0].meals),
                pendingApprovals: parseInt(pending.rows[0].count),
                monthlyData: monthly.rows,
                roleData: roles.rows,
            });
        } else {
            res.status(403).json({ error: 'Unauthorized' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
