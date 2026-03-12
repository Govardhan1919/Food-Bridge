const path = require('path');
require('dotenv').config({ path: path.resolve('../.env') });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
Promise.all([
    p.query("SELECT id, name, email, role, verified_badge FROM users ORDER BY created_at DESC LIMIT 5"),
    p.query("SELECT id, donor_id, title, status, meal_plates FROM donations ORDER BY created_at DESC LIMIT 5"),
    p.query("SELECT id, donor_id, donation_id, status FROM verification_calls ORDER BY created_at DESC LIMIT 5")
]).then(([users, dons, vcs]) => {
    require('fs').writeFileSync('debug_db.json', JSON.stringify({
        users: users.rows,
        donations: dons.rows,
        verification_calls: vcs.rows,
    }, null, 2));
    console.log('Saved to debug_db.json');
    p.end();
}).catch(e => { console.error(e); p.end(); });
