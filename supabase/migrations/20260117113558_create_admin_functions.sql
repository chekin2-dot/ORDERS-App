/*
  # Create Admin Helper Functions

  1. Functions
    - `get_platform_stats` - Get platform statistics
    - `block_user_account` - Block a user account
    - `unblock_user_account` - Unblock a user account
    - `delete_user_account` - Soft delete user account
*/

-- Function to get platform statistics
CREATE OR REPLACE FUNCTION get_platform_stats(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
  date_filter_start timestamptz := COALESCE(start_date, now() - interval '30 days');
  date_filter_end timestamptz := COALESCE(end_date, now());
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM user_profiles),
    'total_clients', (SELECT COUNT(*) FROM user_profiles WHERE user_type = 'client'),
    'total_merchants', (SELECT COUNT(*) FROM merchants),
    'total_drivers', (SELECT COUNT(*) FROM drivers),
    'active_orders', (SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'accepted', 'preparing', 'ready', 'in_delivery')),
    'completed_orders', (SELECT COUNT(*) FROM orders WHERE status = 'delivered' AND created_at BETWEEN date_filter_start AND date_filter_end),
    'total_revenue', (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'delivered' AND created_at BETWEEN date_filter_start AND date_filter_end),
    'blocked_users', (SELECT COUNT(*) FROM user_profiles WHERE status = 'banned'),
    'pending_verifications', (SELECT COUNT(*) FROM drivers WHERE verification_status = 'pending')
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to block user
CREATE OR REPLACE FUNCTION block_user_account(
  target_user_id uuid,
  admin_user_id uuid,
  block_reason text
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(admin_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Update user status
  UPDATE user_profiles
  SET status = 'banned', updated_at = now()
  WHERE id = target_user_id;

  -- Log the action
  INSERT INTO admin_action_logs (admin_user_id, action_type, target_user_id, reason)
  VALUES (
    (SELECT id FROM admin_users WHERE user_id = admin_user_id),
    'block_user',
    target_user_id,
    block_reason
  );

  RETURN jsonb_build_object('success', true, 'message', 'User blocked successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unblock user
CREATE OR REPLACE FUNCTION unblock_user_account(
  target_user_id uuid,
  admin_user_id uuid
)
RETURNS jsonb AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(admin_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Update user status
  UPDATE user_profiles
  SET status = 'active', updated_at = now()
  WHERE id = target_user_id;

  -- Log the action
  INSERT INTO admin_action_logs (admin_user_id, action_type, target_user_id, reason)
  VALUES (
    (SELECT id FROM admin_users WHERE user_id = admin_user_id),
    'unblock_user',
    target_user_id,
    'Account unblocked'
  );

  RETURN jsonb_build_object('success', true, 'message', 'User unblocked successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
