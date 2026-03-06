/*
  # Remove Overly Permissive Notification Policies
  
  1. Problem
    - Old permissive policies allow any authenticated user to insert notifications
    - Public read access policy is too broad
    
  2. Solution
    - Remove conflicting permissive policies
    - Keep only admin-managed policies and user-specific view policies
    
  3. Security
    - Only admins can manage notifications
    - Users can only view active notifications for their type
*/

-- Remove overly permissive policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON system_notifications;
DROP POLICY IF EXISTS "Enable read access for all users" ON system_notifications;