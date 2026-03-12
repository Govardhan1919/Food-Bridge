const path = require('path');
require('dotenv').config({ path: path.resolve('../.env') });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
Promise.all([
    p.query("SELECT id, title, status, meal_plates, created_at FROM donations ORDER BY created_at DESC LIMIT 5"),
    p.query("SELECT vc.id, vc.donor_id, vc.donation_id, vc.status, d.title FROM verification_calls vc JOIN donations d ON vc.donation_id = d.id ORDER BY vc.created_at DESC LIMIT 5")
]).then(([dons, vcs]) => {
    require('fs').writeFileSync('debug_user.json', JSON.stringify({
        newest_donations: dons.rows,
        newest_verification_calls: vcs.rows,
    }, null, 2));
    console.log('Saved to debug_user.json');
    p.end();
}).catch(e => { console.error(e); p.end(); });
