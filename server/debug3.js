const path = require('path');
require('dotenv').config({ path: path.resolve('../.env') });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
Promise.all([
    p.query(`SELECT vc.id, vc.status, d.title, d.status as d_status, vc.donor_id as vc_donor, d.donor_id as d_donor FROM verification_calls vc LEFT JOIN donations d ON vc.donation_id = d.id`),
    p.query(`SELECT id, title, status, meal_plates, donor_id FROM donations ORDER BY created_at DESC LIMIT 5`),
    p.query("SELECT id, name, verified_badge, donation_count FROM users WHERE role='donor'"),
    p.query(`
    SELECT vc.id, u.name AS donor_name, u.email AS donor_email, d.title, d.meal_plates
    FROM verification_calls vc
    JOIN users u ON vc.donor_id = u.id
    JOIN donations d ON vc.donation_id = d.id
    WHERE vc.status = 'pending'
  `)
]).then(([vc, don, donors, joined]) => {
    const fs = require('fs');
    fs.writeFileSync('debug_json.json', JSON.stringify({
        all_calls: vc.rows,
        recent_donations: don.rows,
        donors: donors.rows,
        joined: joined.rows
    }, null, 2));
    console.log('Saved to debug_json.json');
    p.end();
}).catch(e => { console.error(e); p.end(); });
