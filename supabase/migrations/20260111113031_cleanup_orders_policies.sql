/*
  # Clean Up Orders Table Policies

  ## Summary
  This migration removes overly permissive RLS policies that could allow
  unauthorized access to order data.

  ## Changes Made
  - Remove "Enable read access for all users" policy (public access)
  - Remove "Enable insert for authenticated users only" policy (too permissive)
  
  ## Security Impact
  After this migration, orders will only be accessible through specific policies:
  - Clients can view/create/update their own orders
  - Merchants can view/update orders for their shop
  - Drivers can view available orders and their assigned orders
  - Drivers can accept and update their assigned orders
*/

-- Remove overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON orders;
