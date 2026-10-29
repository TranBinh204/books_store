-- Up Migration
CREATE TABLE users (
  id                  SERIAL PRIMARY KEY,
  full_name           VARCHAR(100) NOT NULL,
  email               VARCHAR(255) NOT NULL UNIQUE CHECK (email = lower(email)),
  phone               VARCHAR(15) UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  role                TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
  avatar_url          TEXT,
  birthday            DATE,
  gender              TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  password_changed_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);

-- Down Migration
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS users;
