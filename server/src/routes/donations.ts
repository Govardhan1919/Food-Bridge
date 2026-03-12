import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emitToUsers } from '../index';

const router = Router();

// ── Haversine distance (km) between two lat/lng pairs ───────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── GET /api/donations — role-based listing ──────────────────────────────────
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    try {
        let result;
        if (role === 'donor') {
            result = await pool.query(
                `SELECT d.*, u.name AS donor_name FROM donations d
                 JOIN users u ON d.donor_id = u.id
                 WHERE d.donor_id = $1 ORDER BY d.created_at DESC`,
                [userId]
            );
        } else if (role === 'ngo') {
            const status = req.query.status as string | undefined;
            if (status) {
                result = await pool.query(
                    `SELECT d.*, u.name AS donor_name FROM donations d
                     JOIN users u ON d.donor_id = u.id
                     WHERE d.status = $1 ORDER BY d.created_at DESC`,
                    [status]
                );
            } else {
                result = await pool.query(
                    `SELECT d.*, u.name AS donor_name FROM donations d
                     JOIN users u ON d.donor_id = u.id
                     WHERE d.status = 'available' ORDER BY d.created_at DESC`
                );
            }
        } else {
            result = await pool.query(
                `SELECT d.*, u.name AS donor_name FROM donations d
                 JOIN users u ON d.donor_id = u.id
                 ORDER BY d.created_at DESC`
            );
        }
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/donations/nearby — NGO-only; filter by Haversine ≤ radius ───────
router.get('/nearby', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'ngo') { res.status(403).json({ error: 'NGO only' }); return; }
    const radius = parseFloat(req.query.radius as string) || 10; // default 10 km
    try {
        // Get NGO location
        const ngoRes = await pool.query('SELECT latitude, longitude FROM users WHERE id = $1', [userId]);
        const ngo = ngoRes.rows[0];
        if (!ngo?.latitude || !ngo?.longitude) {
            // No location set – return all available donations
            const result = await pool.query(
                `SELECT d.*, u.name AS donor_name FROM donations d
                 JOIN users u ON d.donor_id = u.id
                 WHERE d.status = 'available' ORDER BY d.created_at DESC`
            );
            res.json(result.rows);
            return;
        }
        const result = await pool.query(
            `SELECT d.*, u.name AS donor_name FROM donations d
             JOIN users u ON d.donor_id = u.id
             WHERE d.status = 'available' AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL`
        );
        const nearby = result.rows.filter((d) => {
            const dist = haversine(
                parseFloat(ngo.latitude), parseFloat(ngo.longitude),
                parseFloat(d.latitude), parseFloat(d.longitude)
            );
            return dist <= radius;
        });
        res.json(nearby);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /api/donations — donor creates a donation ───────────────────────────
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'donor') { res.status(403).json({ error: 'Only donors can create donations' }); return; }
    const { title, meal_plates, latitude, longitude, expiry, scheduled_at } = req.body;
    if (!title || !meal_plates || !latitude || !longitude || !expiry) {
        res.status(400).json({ error: 'title, meal_plates, latitude, longitude and expiry are required' });
        return;
    }
    try {
        // Check donor verification status
        const donorRes = await pool.query(
            'SELECT verified_badge, donation_count FROM users WHERE id = $1', [userId]
        );
        const donor = donorRes.rows[0];
        const needsVerification = !donor.verified_badge;
        const status = needsVerification ? 'pending_verification' : 'available';

        const result = await pool.query(
            `INSERT INTO donations (donor_id, title, meal_plates, latitude, longitude, expiry, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [userId, title, meal_plates, latitude, longitude, expiry, status]
        );
        const donation = result.rows[0];

        if (needsVerification) {
            // Create a verification_call record
            await pool.query(
                `INSERT INTO verification_calls (donor_id, donation_id, scheduled_at) VALUES ($1, $2, $3)`,
                [userId, donation.id, scheduled_at || null]
            );
            // Notify all verifiers (and admins)
            const staff = await pool.query(`SELECT id FROM users WHERE role IN ('admin', 'verifier')`);
            emitToUsers(staff.rows.map((a) => a.id), 'new_verification_request', {
                donorId: userId, donationId: donation.id, title, scheduled_at
            });
        } else {
            // Notify nearby NGOs
            const ngos = await pool.query(`SELECT id, latitude, longitude FROM users WHERE role = 'ngo'`);
            const nearbyNgoIds = ngos.rows
                .filter((n) => {
                    if (!n.latitude || !n.longitude) return true; // no location = notify all
                    return haversine(
                        parseFloat(n.latitude), parseFloat(n.longitude),
                        parseFloat(latitude), parseFloat(longitude)
                    ) <= 10;
                })
                .map((n) => n.id);
            emitToUsers(nearbyNgoIds, 'new_donation', { donation });
            // Persist notification records
            for (const ngoId of nearbyNgoIds) {
                await pool.query(
                    `INSERT INTO notifications (user_id, type, payload) VALUES ($1, 'new_donation', $2)`,
                    [ngoId, JSON.stringify(donation)]
                );
            }
        }
        res.status(201).json(donation);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── PATCH /api/donations/:id/status — update status ─────────────────────────
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role } = req.user!;
    const validStatuses = ['available', 'accepted', 'picked_up', 'delivered'];
    if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
    }
    try {
        let result;
        if (status === 'accepted' && role === 'ngo') {
            result = await pool.query(
                'UPDATE donations SET status = $1, ngo_id = $2 WHERE id = $3 RETURNING *',
                [status, userId, id]
            );
        } else {
            result = await pool.query(
                'UPDATE donations SET status = $1 WHERE id = $2 RETURNING *',
                [status, id]
            );
        }
        if (result.rows.length === 0) { res.status(404).json({ error: 'Donation not found' }); return; }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
