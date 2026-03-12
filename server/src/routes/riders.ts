import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emitToUser } from '../index';
import bcrypt from 'bcryptjs';

const router = Router();

// Vehicle type → capacity (meal plates) mapping
const VEHICLE_CAPACITY: Record<string, number> = {
    bike: 10,
    mini_van: 50,
    van: 100,
    truck: 200,
};

// ── GET /api/riders — NGO: list own riders ───────────────────────────────────
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'ngo' && role !== 'admin') { res.status(403).json({ error: 'NGO/Admin only' }); return; }
    try {
        const ngoId = role === 'admin' ? (req.query.ngo_id || null) : userId;
        const result = ngoId
            ? await pool.query(
                `SELECT id, name, email, phone, is_online, vehicle_type, vehicle_capacity,
                        aadhaar_no, vehicle_no, address, driving_licence_no, created_at
                 FROM users WHERE role = 'rider' AND ngo_id = $1 ORDER BY name`, [ngoId])
            : await pool.query(
                `SELECT id, name, email, phone, is_online, vehicle_type, vehicle_capacity,
                        aadhaar_no, vehicle_no, address, driving_licence_no, ngo_id, created_at
                 FROM users WHERE role = 'rider' ORDER BY name`);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /api/riders — NGO: create & link a new rider ───────────────────────
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'ngo') { res.status(403).json({ error: 'NGO only' }); return; }
    const { name, email, phone, password, vehicle_type,
        aadhaar_no, vehicle_no, address, driving_licence_no } = req.body;
    const validTypes = Object.keys(VEHICLE_CAPACITY);
    if (!name || !password || !vehicle_type || !phone ||
        !aadhaar_no || !vehicle_no || !address || !driving_licence_no) {
        res.status(400).json({ error: 'name, phone, password, vehicle_type, aadhaar_no, vehicle_no, address and driving_licence_no are required' }); return;
    }
    if (!validTypes.includes(vehicle_type)) {
        res.status(400).json({ error: `vehicle_type must be one of: ${validTypes.join(', ')}` }); return;
    }
    const vehicle_capacity = VEHICLE_CAPACITY[vehicle_type];
    try {
        if (email) {
            const dup = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (dup.rows.length > 0) { res.status(409).json({ error: 'Email already registered' }); return; }
        }
        if (phone) {
            const dup = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
            if (dup.rows.length > 0) { res.status(409).json({ error: 'Phone already registered' }); return; }
        }
        const password_hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users
             (name, email, phone, password_hash, role, vehicle_type, vehicle_capacity,
              aadhaar_no, vehicle_no, address, driving_licence_no, ngo_id)
             VALUES ($1, $2, $3, $4, 'rider', $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, name, email, phone, is_online, vehicle_type, vehicle_capacity,
                       aadhaar_no, vehicle_no, address, driving_licence_no, ngo_id`,
            [name, email || null, phone || null, password_hash,
                vehicle_type, vehicle_capacity,
                aadhaar_no || null, vehicle_no || null, address || null, driving_licence_no || null,
                userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── PATCH /api/riders/:id/status — RIDER ONLY: toggle own online status ────
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    const targetId = parseInt(req.params.id);
    // Only riders can toggle their own status
    if (role !== 'rider' || userId !== targetId) {
        res.status(403).json({ error: 'Only a rider can change their own online status' }); return;
    }
    const { is_online } = req.body;
    if (typeof is_online !== 'boolean') {
        res.status(400).json({ error: 'is_online (boolean) is required' }); return;
    }
    try {
        const result = await pool.query(
            `UPDATE users SET is_online = $1 WHERE id = $2 RETURNING id, name, is_online`,
            [is_online, targetId]
        );
        if (result.rows.length === 0) { res.status(404).json({ error: 'Rider not found' }); return; }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/riders/:id/rides — NGO: view all rides for a specific rider ─────
router.get('/:id/rides', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'ngo' && role !== 'admin') { res.status(403).json({ error: 'NGO/Admin only' }); return; }
    const riderId = parseInt(req.params.id);
    try {
        const result = await pool.query(
            `SELECT p.id, p.status, p.from_location, p.to_location, p.created_at,
                    d.title AS donation_title, d.meal_plates, d.expiry,
                    donor.name AS donor_name
             FROM pickups p
             JOIN donations d ON p.donation_id = d.id
             LEFT JOIN users donor ON d.donor_id = donor.id
             WHERE p.rider_id = $1 AND p.ngo_id = $2
             ORDER BY p.created_at DESC`,
            [riderId, userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/riders/eligible/:donationId — NGO: capacity-filtered available riders
router.get('/eligible/:donationId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'ngo') { res.status(403).json({ error: 'NGO only' }); return; }
    try {
        const donRes = await pool.query('SELECT meal_plates FROM donations WHERE id = $1', [req.params.donationId]);
        if (donRes.rows.length === 0) { res.status(404).json({ error: 'Donation not found' }); return; }
        const plates = donRes.rows[0].meal_plates;
        const result = await pool.query(
            `SELECT id, name, email, phone, is_online, vehicle_type, vehicle_capacity FROM users
             WHERE role = 'rider' AND ngo_id = $1 AND is_online = true AND vehicle_capacity >= $2
             ORDER BY vehicle_capacity ASC`,
            [userId, plates]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /api/riders/:riderId/assign/:donationId — NGO: assign rider to donation
router.post('/:riderId/assign/:donationId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId, role } = req.user!;
    if (role !== 'ngo') { res.status(403).json({ error: 'NGO only' }); return; }
    const { riderId, donationId } = req.params;
    try {
        // Get donation info
        const donRes = await pool.query('SELECT * FROM donations WHERE id = $1', [donationId]);
        if (donRes.rows.length === 0) { res.status(404).json({ error: 'Donation not found' }); return; }
        const donation = donRes.rows[0];

        // Get NGO name for to_location
        const ngoRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
        const ngoName = ngoRes.rows[0]?.name || 'NGO Distribution Centre';

        // Create pickup record
        const pickupRes = await pool.query(
            `INSERT INTO pickups (rider_id, ngo_id, donation_id, from_location, to_location)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [riderId, userId, donationId, `${donation.latitude},${donation.longitude}`, ngoName]
        );
        const pickup = pickupRes.rows[0];

        // Update donation status to accepted
        await pool.query(`UPDATE donations SET status = 'accepted', ngo_id = $1 WHERE id = $2`, [userId, donationId]);

        // Notify the rider
        emitToUser(parseInt(riderId), 'pickup_assigned', { pickup, donation });
        await pool.query(
            `INSERT INTO notifications (user_id, type, payload) VALUES ($1, 'pickup_assigned', $2)`,
            [riderId, JSON.stringify({ pickup, donation })]
        );

        res.json({ pickup });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
