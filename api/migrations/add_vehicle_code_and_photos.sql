-- Migration: Add vehicle_code and multiple photo columns to vehicles table
-- Run this in phpMyAdmin or MySQL CLI

ALTER TABLE vehicles 
  ADD COLUMN vehicle_code VARCHAR(50) NULL AFTER id,
  ADD COLUMN photo_front VARCHAR(255) NULL AFTER photo,
  ADD COLUMN photo_back VARCHAR(255) NULL AFTER photo_front,
  ADD COLUMN photo_left VARCHAR(255) NULL AFTER photo_back,
  ADD COLUMN photo_right VARCHAR(255) NULL AFTER photo_left;

-- Add unique index for vehicle_code (optional, allows NULL duplicates)
ALTER TABLE vehicles ADD UNIQUE INDEX idx_vehicle_code (vehicle_code);
