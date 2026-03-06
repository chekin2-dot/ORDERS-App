/*
  # Enable Realtime for Messaging Tables
  
  ## Changes
  1. Enable realtime replication for order_conversations table
  2. Enable realtime replication for order_messages table
  
  ## Purpose
  Allows real-time updates when new conversations or messages are created
*/

-- Enable realtime for order_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE order_conversations;

-- Enable realtime for order_messages  
ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
