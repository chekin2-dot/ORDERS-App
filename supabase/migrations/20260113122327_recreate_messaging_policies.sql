/*
  # Recreate Messaging Policies with Proper Security
  
  ## Problem
  Previous migration dropped all messaging policies but didn't recreate them,
  leaving tables with RLS enabled but no policies - blocking all operations.
  
  ## Changes
  1. Recreate SELECT policies for conversations (clients and drivers)
  2. Recreate INSERT policy for conversations (clients and drivers can create)
  3. Recreate SELECT policy for messages (participants only)
  4. Recreate INSERT policy for messages (participants only)
  5. Recreate UPDATE policy for messages (mark as read)
  
  ## Security
  - Clients can only access their own conversations
  - Drivers can only access conversations where they are assigned
  - Only conversation participants can send/read messages
  - Proper WITH CHECK clauses for inserts
*/

-- Policies for order_conversations

-- Allow drivers to view their conversations
CREATE POLICY "Drivers can view their conversations"
  ON order_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = order_conversations.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Allow clients to view their conversations
CREATE POLICY "Clients can view their conversations"
  ON order_conversations FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Allow clients to create conversations
CREATE POLICY "Clients can create conversations"
  ON order_conversations FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Allow drivers to create conversations
CREATE POLICY "Drivers can create conversations"
  ON order_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Policies for order_messages

-- Allow participants to view messages
CREATE POLICY "Participants can view messages"
  ON order_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_conversations
      WHERE order_conversations.id = order_messages.conversation_id
      AND (
        order_conversations.client_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM drivers
          WHERE drivers.id = order_conversations.driver_id
          AND drivers.user_id = auth.uid()
        )
      )
    )
  );

-- Allow participants to send messages
CREATE POLICY "Participants can send messages"
  ON order_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM order_conversations
      WHERE order_conversations.id = conversation_id
      AND (
        order_conversations.client_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM drivers
          WHERE drivers.id = order_conversations.driver_id
          AND drivers.user_id = auth.uid()
        )
      )
    )
  );

-- Allow participants to update messages (mark as read)
CREATE POLICY "Participants can mark messages as read"
  ON order_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_conversations
      WHERE order_conversations.id = order_messages.conversation_id
      AND (
        order_conversations.client_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM drivers
          WHERE drivers.id = order_conversations.driver_id
          AND drivers.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_conversations
      WHERE order_conversations.id = order_messages.conversation_id
      AND (
        order_conversations.client_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM drivers
          WHERE drivers.id = order_conversations.driver_id
          AND drivers.user_id = auth.uid()
        )
      )
    )
  );