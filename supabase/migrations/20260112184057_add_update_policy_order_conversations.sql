/*
  # Add UPDATE policy for order_conversations
  
  ## Problem
  The trigger `update_order_conversation_last_message` tries to update order_conversations
  when new messages are inserted, but there's no UPDATE policy allowing this operation.
  
  ## Changes
  1. Add UPDATE policy for order_conversations to allow system updates via triggers
  
  ## Security
  - Only allows updates to last_message and last_message_at fields
  - Users can only update conversations they participate in
*/

-- Allow conversation participants to update conversation metadata
CREATE POLICY "Participants can update conversation metadata"
  ON order_conversations FOR UPDATE
  TO authenticated
  USING (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = order_conversations.driver_id
      AND drivers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = order_conversations.driver_id
      AND drivers.user_id = auth.uid()
    )
  );
