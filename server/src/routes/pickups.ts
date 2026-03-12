import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emitToUser } from '../index';

const router = Router();

// Haversine (km)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── GET /api/pickups ─────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    try {
        let result;
        if (role === 'rider') {
            result = await pool.query(
                `SELECT p.*, d.title AS item, d.meal_plates, d.latitude AS pickup_lat, d.longitude AS pickup_lon
                 FROM pickups p JOIN donations d ON p.donation_id = d.id
                 WHERE p.rider_id = $1 ORDER BY p.created_at DESC`,
                [userId]
            );
        } else if (role === 'ngo') {
            result = await pool.query(
                `SELECT p.*, d.title AS item, d.meal_plates, u.name AS rider_name, u.is_online AS rider_online
                 FROM pickups p
                 JOIN donations d ON p.donation_id = d.id
                 LEFT JOIN users u ON p.rider_id = u.id
                 WHERE p.ngo_id = $1 ORDER BY p.created_at DESC`,
                [userId]
            );
        } else {
            // admin sees all
            result = await pool.query(
                `SELECT p.*, d.title AS item, d.meal_plates, u.name AS rider_name
                 FROM pickups p
                 JOIN donations d ON p.donation_id = d.id
                 LEFT JOIN users u ON p.rider_id = u.id
                 ORDER BY p.created_at DESC`
            );
        }
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /api/pickups — NGO creates a pickup manually ───────────────────────
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'ngo' && role !== 'admin') {
        res.status(403).json({ error: 'Only NGOs can create pickups' }); return;
    }
    const { donation_id, from_location, to_location, rider_id, scheduled_time } = req.body;
    if (!donation_id || !from_location || !to_location) {
        res.status(400).json({ error: 'donation_id, from_location and to_location are required' }); return;
    }
    try {
        const result = await pool.query(
            `INSERT INTO pickups (donation_id, ngo_id, rider_id, from_location, to_location, scheduled_time)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [donation_id, userId, rider_id ?? null, from_location, to_location, scheduled_time ?? null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── PATCH /api/pickups/:id/status — update pickup status ────────────────────
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role } = req.user!;
    const valid = ['pending', 'in_progress', 'completed'];
    if (!valid.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
    try {
        let result;
        if (role === 'rider') {
            result = await pool.query(
                'UPDATE pickups SET status = $1 WHERE id = $2 AND rider_id = $3 RETURNING *',
                [status, id, userId]
            );
        } else {
            result = await pool.query('UPDATE pickups SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
        }
        if (result.rows.length === 0) { res.status(404).json({ error: 'Pickup not found or not authorized' }); return; }
        const pickup = result.rows[0];

        // When rider goes in_progress, check for en-route opportunities
        if (status === 'in_progress' && role === 'rider') {
            await checkEnRouteOpportunities(userId, pickup);
        }
        // When completed, update donation status to delivered
        if (status === 'completed') {
            await pool.query(`UPDATE donations SET status = 'delivered' WHERE id = $1`, [pickup.donation_id]);
            // Also mark extra donations as delivered
            const extras: number[] = pickup.extra_donation_ids || [];
            for (const extraId of extras) {
                await pool.query(`UPDATE donations SET status = 'delivered' WHERE id = $1`, [extraId]);
            }
        }
        res.json(pickup);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /api/pickups/:id/accept-extra/:donationId — rider accepts en-route donation
router.post('/:id/accept-extra/:donationId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'rider') { res.status(403).json({ error: 'Rider only' }); return; }
    const { id, donationId } = req.params;
    try {
        const pickupRes = await pool.query('SELECT * FROM pickups WHERE id = $1 AND rider_id = $2', [id, userId]);
        if (pickupRes.rows.length === 0) { res.status(404).json({ error: 'Pickup not found' }); return; }
        const pickup = pickupRes.rows[0];
        const extras: number[] = pickup.extra_donation_ids || [];
        if (!extras.includes(parseInt(donationId))) {
            extras.push(parseInt(donationId));
        }
        await pool.query(
            `UPDATE pickups SET extra_donation_ids = $1 WHERE id = $2`,
            [JSON.stringify(extras), id]
        );
        await pool.query(`UPDATE donations SET status = 'accepted' WHERE id = $1`, [donationId]);
        res.json({ success: true, extra_donation_ids: extras });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/pickups/en-route — rider: get opportunistic nearby donations ────
router.get('/en-route', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'rider') { res.status(403).json({ error: 'Rider only' }); return; }
    const { lat, lon } = req.query;
    if (!lat || !lon) { res.status(400).json({ error: 'lat and lon required' }); return; }
    try {
        // Get rider's vehicle capacity and current pickup to calculate remaining capacity
        const riderRes = await pool.query('SELECT vehicle_capacity FROM users WHERE id = $1', [userId]);
        const rider = riderRes.rows[0];
        if (!rider) { res.status(404).json({ error: 'Rider not found' }); return; }

        const activePickup = await pool.query(
            `SELECT p.*, d.meal_plates FROM pickups p
             JOIN donations d ON p.donation_id = d.id
             WHERE p.rider_id = $1 AND p.status = 'in_progress' LIMIT 1`,
            [userId]
        );
        let usedCapacity = 0;
        if (activePickup.rows.length > 0) {
            usedCapacity = activePickup.rows[0].meal_plates;
            const extras: number[] = activePickup.rows[0].extra_donation_ids || [];
            if (extras.length > 0) {
                const extraRes = await pool.query(
                    `SELECT COALESCE(SUM(meal_plates), 0) AS total FROM donations WHERE id = ANY($1)`,
                    [extras]
                );
                usedCapacity += parseInt(extraRes.rows[0].total);
            }
        }
        const remainingCapacity = (rider.vehicle_capacity || 0) - usedCapacity;
        if (remainingCapacity <= 0) { res.json([]); return; }

        // Find available donations within 2km
        const available = await pool.query(
            `SELECT * FROM donations WHERE status = 'available' AND latitude IS NOT NULL AND longitude IS NOT NULL`
        );
        const nearby = available.rows.filter((d) => {
            const dist = haversine(parseFloat(lat as string), parseFloat(lon as string),
                parseFloat(d.latitude), parseFloat(d.longitude));
            return dist <= 2 && d.meal_plates <= remainingCapacity;
        });
        res.json(nearby);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

/** Check and emit en-route donation opportunities for a rider */
async function checkEnRouteOpportunities(riderId: number, pickup: Record<string, unknown>) {
    try {
        const riderRes = await pool.query(
            'SELECT vehicle_capacity FROM users WHERE id = $1', [riderId]
        );
        const rider = riderRes.rows[0];
        if (!rider) return;

        const donRes = await pool.query(
            'SELECT meal_plates FROM donations WHERE id = $1', [pickup.donation_id]
        );
        const primaryPlates = donRes.rows[0]?.meal_plates || 0;
        const remainingCapacity = (rider.vehicle_capacity || 0) - primaryPlates;
        if (remainingCapacity <= 0) return;

        // Get donation location for proximity search
        const donLoc = await pool.query(
            'SELECT latitude, longitude FROM donations WHERE id = $1', [pickup.donation_id]
        );
        if (!donLoc.rows[0]?.latitude) return;

        const available = await pool.query(
            `SELECT * FROM donations WHERE status = 'available' AND latitude IS NOT NULL AND longitude IS NOT NULL`
        );
        const nearby = available.rows.filter((d) => {
            const dist = haversine(
                parseFloat(donLoc.rows[0].latitude), parseFloat(donLoc.rows[0].longitude),
                parseFloat(d.latitude), parseFloat(d.longitude)
            );
            return dist <= 2 && d.meal_plates <= remainingCapacity;
        });
        if (nearby.length > 0) {
            emitToUser(riderId, 'en_route_opportunity', { donations: nearby, remainingCapacity });
        }
    } catch (err) {
        console.error('En-route check error:', err);
    }
}

export default router;
