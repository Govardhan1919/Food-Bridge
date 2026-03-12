const path = require('path');
require('dotenv').config({ path: path.resolve('../.env') });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query(`
  SELECT vc.id, vc.status, d.title, d.status as d_status
  FROM verification_calls vc
  LEFT JOIN donations d ON vc.donation_id = d.id
`).then(r => {
    console.log('ALL CALLS:');
    console.table(r.rows);
    return p.query(`
    SELECT vc.*, u.name AS donor_name, u.email AS donor_email,
           d.title, d.meal_plates, d.latitude, d.longitude, d.expiry
    FROM verification_calls vc
    JOIN users u ON vc.donor_id = u.id
    JOIN donations d ON vc.donation_id = d.id
    WHERE vc.status = 'pending'
    ORDER BY vc.created_at ASC
  `);
}).then(r => {
    console.log('JOINED CALLS:');
    console.table(r.rows);
    p.end();
}).catch(e => { console.error(e); p.end(); });
