-- PostGIS Road Safety Database Schema
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  vehicle_type VARCHAR(50) DEFAULT 'car',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS potholes (
  id SERIAL PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
  road_name VARCHAR(255) NOT NULL,
  confidence DOUBLE PRECISION DEFAULT 0.85,
  report_count INTEGER DEFAULT 1,
  depth_estimate_cm DOUBLE PRECISION,
  image_url TEXT,
  reported_by INTEGER REFERENCES users(id),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS potholes_location_idx ON potholes USING GIST (location);
CREATE INDEX IF NOT EXISTS potholes_severity_idx ON potholes (severity);
