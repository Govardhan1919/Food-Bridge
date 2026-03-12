import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emitToUser, emitToUsers } from '../index';

const router = Router();

// ── GET /api/verification — admin: list pending calls ───────────────────────
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (!['admin', 'verifier'].includes(req.user!.role)) { res.status(403).json({ error: 'Admin/Verifier only' }); return; }
    try {
        const result = await pool.query(
            `SELECT vc.*, u.name AS donor_name, u.email AS donor_email,
                    d.title, d.meal_plates, d.latitude, d.longitude, d.expiry
             FROM verification_calls vc
             JOIN users u ON vc.donor_id = u.id
             JOIN donations d ON vc.donation_id = d.id
             WHERE vc.status = 'pending'
             ORDER BY vc.created_at ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── PATCH /api/verification/:id/complete — admin marks call done ─────────────
router.patch('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (!['admin', 'verifier'].includes(req.user!.role)) { res.status(403).json({ error: 'Admin/Verifier only' }); return; }
    const { id } = req.params;
    try {
        // Mark the call complete
        const callRes = await pool.query(
            `UPDATE verification_calls
             SET status = 'completed', completed_at = NOW()
             WHERE id = $1 RETURNING *`,
            [id]
        );
        if (callRes.rows.length === 0) { res.status(404).json({ error: 'Verification call not found' }); return; }
        const call = callRes.rows[0];

        // Set the donation to 'available'
        await pool.query(
            `UPDATE donations SET status = 'available' WHERE id = $1`,
            [call.donation_id]
        );

        // Increment donor's donation_count
        const donorRes = await pool.query(
            `UPDATE users SET donation_count = donation_count + 1
             WHERE id = $1
             RETURNING donation_count, verified_badge`,
            [call.donor_id]
        );
        const donor = donorRes.rows[0];

        // Grant badge if they hit 5 verified donations
        if (donor.donation_count >= 5 && !donor.verified_badge) {
            await pool.query(
                `UPDATE users SET verified_badge = true WHERE id = $1`, [call.donor_id]
            );
            emitToUser(call.donor_id, 'badge_earned', { message: 'Congratulations! You earned the Verified Donor badge 🏅' });
        }

        // Make the donation visible to nearby NGOs
        const donationRes = await pool.query('SELECT * FROM donations WHERE id = $1', [call.donation_id]);
        const donation = donationRes.rows[0];
        const ngos = await pool.query(`SELECT id FROM users WHERE role = 'ngo'`);
        emitToUsers(ngos.rows.map((n) => n.id), 'new_donation', { donation });
        for (const ngo of ngos.rows) {
            await pool.query(
                `INSERT INTO notifications (user_id, type, payload) VALUES ($1, 'new_donation', $2)`,
                [ngo.id, JSON.stringify(donation)]
            );
        }

        // Notify the donor
        emitToUser(call.donor_id, 'verification_complete', {
            donationId: call.donation_id,
            donationCount: donor.donation_count,
            verifiedBadge: donor.donation_count >= 5,
        });

        res.json({ success: true, donation_count: donor.donation_count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /api/verification/:id/ring — verifier starts call ────────────────────
router.post('/:id/ring', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (!['admin', 'verifier'].includes(req.user!.role)) { res.status(403).json({ error: 'Admin/Verifier only' }); return; }
    const { id } = req.params;
    try {
        const callRes = await pool.query(`SELECT donor_id, donation_id FROM verification_calls WHERE id = $1`, [id]);
        if (callRes.rows.length === 0) { res.status(404).json({ error: 'Call not found' }); return; }
        const donorId = callRes.rows[0].donor_id;
        const donationId = callRes.rows[0].donation_id;

        const verifierRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user!.userId]);
        const verifierName = verifierRes.rows[0]?.name || 'A verifier';

        emitToUser(donorId, 'incoming_video_call', {
            donationId: Number(donationId),
            verifierName
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/verification/all — admin sees all calls ────────────────────────
router.get('/all', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (!['admin', 'verifier'].includes(req.user!.role)) { res.status(403).json({ error: 'Admin/Verifier only' }); return; }
    try {
        const result = await pool.query(
            `SELECT vc.*, u.name AS donor_name, d.title
             FROM verification_calls vc
             JOIN users u ON vc.donor_id = u.id
             JOIN donations d ON vc.donation_id = d.id
             ORDER BY vc.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
