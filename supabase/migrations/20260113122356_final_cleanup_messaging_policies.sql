/*
  # Final Cleanup of Messaging Policies
  
  ## Problem
  Old permissive policies still exist and are conflicting with proper policies.
  Multiple duplicate policies causing confusion.
  
  ## Changes
  1. Drop ALL existing policies
  2. Recreate only the essential secure policies
  
  ## Security
  - Only authenticated users can access conversations they participate in
  - Proper WITH CHECK clauses for all INSERT operations
*/

-- Drop ALL existing policies for order_conversations
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON order_conversations;
DROP POLICY IF EXISTS "Enable read access for all users" ON order_conversations;
DROP POLICY IF EXISTS "Users can view related conversations" ON order_conversations;
DROP POLICY IF EXISTS "Users can create conversations for their orders" ON order_conversations;
DROP POLICY IF EXISTS "Clients can view their conversations" ON order_conversations;
DROP POLICY IF EXISTS "Clients can create conversations" ON order_conversations;
DROP POLICY IF EXISTS "Drivers can view their conversations" ON order_conversations;
DROP POLICY IF EXISTS "Drivers can create conversations" ON order_conversations;
DROP POLICY IF EXISTS "Participants can update conversation metadata" ON order_conversations;

-- Drop ALL existing policies for order_messages
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON order_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON order_messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON order_messages;
DROP POLICY IF EXISTS "Users can send messages" ON order_messages;
DROP POLICY IF EXISTS "Users can update message read status" ON order_messages;
DROP POLICY IF EXISTS "Participants can view messages" ON order_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON order_messages;
DROP POLICY IF EXISTS "Participants can mark messages as read" ON order_messages;

-- Recreate clean policies for order_conversations

CREATE POLICY "conversations_select_client"
  ON order_conversations FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "conversations_select_driver"
  ON order_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = order_conversations.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_insert_client"
  ON order_conversations FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "conversations_insert_driver"
  ON order_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_id
      AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_update_participants"
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

-- Recreate clean policies for order_messages

CREATE POLICY "messages_select_participants"
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

CREATE POLICY "messages_insert_participants"
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

CREATE POLICY "messages_update_participants"
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