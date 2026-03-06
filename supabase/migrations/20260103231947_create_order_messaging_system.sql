/*
  # Create Order Messaging System

  ## Overview
  Creates a messaging system for driver-client communication specific to order deliveries.
  Automatically creates conversations when drivers accept orders.

  ## New Tables
  1. `order_conversations`
    - Links to specific orders
    - Connects driver and client
    - Tracks last message for previews
    
  2. `order_messages`
    - Stores individual messages
    - Tracks read status
    - Real-time updates

  ## Security
  - RLS policies ensure drivers and clients can only access their own conversations
  - Messages are only visible to conversation participants

  ## Features
  - Auto-updates conversation preview when new message sent
  - Efficient indexing for performance
*/

-- Create order_conversations table
CREATE TABLE IF NOT EXISTS order_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  last_message text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create order_messages table
CREATE TABLE IF NOT EXISTS order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES order_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_messages_conversation ON order_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_created ON order_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_conversations_driver ON order_conversations(driver_id);
CREATE INDEX IF NOT EXISTS idx_order_conversations_client ON order_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_order_conversations_last_msg ON order_conversations(last_message_at DESC);

-- Enable RLS
ALTER TABLE order_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_conversations
CREATE POLICY "Drivers view their order conversations"
  ON order_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = order_conversations.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients view their order conversations"
  ON order_conversations FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "System creates order conversations"
  ON order_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- RLS Policies for order_messages
CREATE POLICY "Users view messages in their conversations"
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

CREATE POLICY "Users send messages in their conversations"
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

CREATE POLICY "Users mark messages as read"
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

-- Function to update conversation last_message
CREATE OR REPLACE FUNCTION update_order_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE order_conversations
  SET 
    last_message = NEW.message,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating conversation
DROP TRIGGER IF EXISTS trigger_update_order_conversation ON order_messages;
CREATE TRIGGER trigger_update_order_conversation
  AFTER INSERT ON order_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_order_conversation_last_message();
