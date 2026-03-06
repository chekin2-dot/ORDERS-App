/*
  # Drop Overly Permissive Messaging Policies
  
  ## Problem
  Old permissive policies are conflicting with proper restrictive policies
  
  ## Changes
  Drop only the overly permissive policies:
  - "Enable insert for authenticated users only" (allows anyone to insert)
  - "Enable read access for all users" (allows public to read)
  - "System can create conversations" (duplicate with WITH CHECK true)
  - "System creates order conversations" (duplicate)
  
  ## Security
  Keeps proper restrictive policies in place
*/

-- Drop overly permissive policies for order_conversations
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON order_conversations;
DROP POLICY IF EXISTS "Enable read access for all users" ON order_conversations;
DROP POLICY IF EXISTS "System can create conversations" ON order_conversations;
DROP POLICY IF EXISTS "System creates order conversations" ON order_conversations;
DROP POLICY IF EXISTS "Drivers view their order conversations" ON order_conversations;
DROP POLICY IF EXISTS "Clients view their order conversations" ON order_conversations;

-- Drop overly permissive policies for order_messages
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON order_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON order_messages;
DROP POLICY IF EXISTS "Users view messages in their conversations" ON order_messages;
DROP POLICY IF EXISTS "Users send messages in their conversations" ON order_messages;
DROP POLICY IF EXISTS "Users mark messages as read" ON order_messages;
