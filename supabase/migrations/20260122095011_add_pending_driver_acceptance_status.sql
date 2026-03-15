/*
  # Add pending_driver_acceptance to order_status enum

  1. Changes
    - Adds 'pending_driver_acceptance' value to the order_status enum
    - This status represents when a client has requested a specific driver but the driver hasn't accepted yet
    - This allows for a driver approval workflow before the order moves to 'accepted'

  2. Notes
    - The status flow: pending → pending_driver_acceptance → accepted → preparing → ready → in_delivery → delivered
    - Or: pending → pending_driver_acceptance → rejected (if driver declines)
*/

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_driver_acceptance';
