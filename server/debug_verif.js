const path = require('path');
require('dotenv').config({ path: path.resolve('../.env') });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
Promise.all([
    p.query('SELECT vc.id, vc.status, vc.donor_id, vc.donation_id, d.title, d.meal_plates, d.expiry FROM verification_calls vc JOIN donations d ON vc.donation_id = d.id ORDER BY vc.created_at DESC LIMIT 10'),
    p.query("SELECT d.id, d.title, d.status, d.meal_plates, d.expiry, (expiry IS NULL) as null_expiry FROM donations d ORDER BY d.created_at DESC LIMIT 10"),
    p.query("SELECT id, name, verified_badge, donation_count FROM users WHERE role='donor'"),
]).then(([vc, don, donors]) => {
    console.log('VERIFICATION_CALLS:', JSON.stringify(vc.rows, null, 2));
    console.log('DONATIONS:', JSON.stringify(don.rows, null, 2));
    console.log('DONORS:', JSON.stringify(donors.rows, null, 2));
    p.end();
}).catch(e => { console.error('ERR:', e.message); p.end(); });
