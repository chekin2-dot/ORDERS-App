/*
  # Add Policy for Clients to Update Their Own Orders

  1. Changes
    - Add RLS policy allowing clients to update their own orders
    - This is needed for assigning drivers and updating order status

  2. Security
    - Clients can only update orders where they are the client_id
    - Cannot update other users' orders
*/

CREATE POLICY "Clients can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());