-- FoodBridge PostgreSQL Schema (v2)

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('donor', 'ngo', 'rider', 'admin', 'verifier')),
  phone VARCHAR(20) UNIQUE,             -- riders login via phone; optional for others
  -- Shared location fields (NGO centre / donor default pickup location)
  latitude  TEXT,
  longitude TEXT,
  -- Donor verification
  verified_badge  BOOLEAN NOT NULL DEFAULT false,
  donation_count  INTEGER NOT NULL DEFAULT 0,
  -- Rider-specific
  vehicle_type     VARCHAR(20),      -- 'bike' | 'mini_van' | 'van' | 'truck'
  vehicle_capacity INTEGER,          -- auto-derived from vehicle_type
  aadhaar_no       VARCHAR(20),
  vehicle_no       VARCHAR(30),
  address          TEXT,
  driving_licence_no VARCHAR(30),
  is_online        BOOLEAN NOT NULL DEFAULT false,
  ngo_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Donations ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  donor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ngo_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title       VARCHAR(255) NOT NULL,
  meal_plates INTEGER NOT NULL,
  latitude    TEXT NOT NULL,
  longitude   TEXT NOT NULL,
  expiry      VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'available'
    CHECK (status IN ('pending_verification', 'available', 'accepted', 'picked_up', 'delivered')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Verification Calls ───────────────────────────────────────────────────────
-- Tracks the admin-donor video verification calls required for the first 5 donations.
CREATE TABLE IF NOT EXISTS verification_calls (
  id          SERIAL PRIMARY KEY,
  donor_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  donation_id INTEGER NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed')),
  scheduled_at  TIMESTAMP,
  completed_at  TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ─── Pickups ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickups (
  id          SERIAL PRIMARY KEY,
  rider_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ngo_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  donation_id INTEGER NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  from_location VARCHAR(255) NOT NULL,
  to_location   VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  -- Stores IDs of extra donations picked up en-route (JSON array of ints)
  extra_donation_ids JSONB DEFAULT '[]',
  scheduled_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type    VARCHAR(50) NOT NULL,   -- e.g. 'new_donation', 'pickup_assigned', 'en_route_opportunity'
  payload JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
