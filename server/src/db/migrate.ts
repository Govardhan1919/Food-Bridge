import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    try {
        await pool.query(sql);
        console.log('✅ Base tables ensured (v2 schema).');

        // ── Idempotent column additions for existing databases ────────────────

        // users – location
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude  TEXT`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude TEXT`);
        // users – donor verification
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_badge BOOLEAN NOT NULL DEFAULT false`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS donation_count  INTEGER NOT NULL DEFAULT 0`);
        // users – rider
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_capacity INTEGER`);
        // users – vehicle type (replaces free-text capacity)
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20)`);
        // users – rider identity fields
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR(20)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(30)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driving_licence_no VARCHAR(30)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ngo_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
        // users – make email optional (riders register with phone only)
        await pool.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);
        // users – phone
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE`);
        // users – role enum: add 'rider' if missing
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type t
                    JOIN pg_enum e ON e.enumtypid = t.oid
                    WHERE t.typname = 'user_role' AND e.enumlabel = 'rider'
                ) THEN
                    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
                    ALTER TABLE users ADD CONSTRAINT users_role_check
                        CHECK (role IN ('donor','ngo','rider','admin','verifier'));
                END IF;
            END
            $$;
        `);
        // Rename old role value 'volunteer' → 'rider'
        await pool.query(`UPDATE users SET role = 'rider' WHERE role = 'volunteer'`);

        // donations – new columns
        await pool.query(`ALTER TABLE donations ADD COLUMN IF NOT EXISTS meal_plates INTEGER`);
        await pool.query(`ALTER TABLE donations ADD COLUMN IF NOT EXISTS latitude  TEXT`);
        await pool.query(`ALTER TABLE donations ADD COLUMN IF NOT EXISTS longitude TEXT`);
        await pool.query(`ALTER TABLE donations ADD COLUMN IF NOT EXISTS expiry    VARCHAR(100)`);
        // Drop NOT NULL from any legacy columns that block the new INSERT
        const legacyCols = ['type', 'location', 'quantity', 'food_type', 'pickup_location', 'description', 'category', 'address', 'pickup_lat', 'pickup_lon'];
        for (const col of legacyCols) {
            await pool.query(`
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='donations' AND column_name='${col}') THEN
                        ALTER TABLE donations ALTER COLUMN ${col} DROP NOT NULL;
                    END IF;
                END $$;
            `);
        }
        // donations – status enum: add 'pending_verification'
        await pool.query(`
            ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_status_check;
            ALTER TABLE donations ADD CONSTRAINT donations_status_check
                CHECK (status IN ('pending_verification','available','accepted','picked_up','delivered'));
        `);
        // donations – backfill meal_plates from quantity where possible
        await pool.query(`
            UPDATE donations SET meal_plates = CAST(REGEXP_REPLACE(quantity, '[^0-9]', '', 'g') AS INTEGER)
            WHERE meal_plates IS NULL AND quantity ~ '[0-9]'
        `);

        // pickups – new columns
        await pool.query(`ALTER TABLE pickups ADD COLUMN IF NOT EXISTS rider_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
        await pool.query(`ALTER TABLE pickups ADD COLUMN IF NOT EXISTS ngo_id   INTEGER REFERENCES users(id) ON DELETE SET NULL`);
        await pool.query(`ALTER TABLE pickups ADD COLUMN IF NOT EXISTS extra_donation_ids JSONB DEFAULT '[]'`);
        // rename volunteer_id → rider_id (soft – copy data)
        await pool.query(`UPDATE pickups SET rider_id = volunteer_id WHERE rider_id IS NULL AND volunteer_id IS NOT NULL`);

        console.log('✅ All column migrations applied.');
        console.log('✅ Migration complete (v2).');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
