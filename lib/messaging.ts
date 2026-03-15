import { supabase } from './supabase';

export async function createOrderConversation(
  orderId: string,
  driverId: string,
  clientId: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    const { data: existingConv } = await supabase
      .from('order_conversations')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingConv) {
      return { success: true, conversationId: existingConv.id };
    }

    const { data, error } = await supabase
      .from('order_conversations')
      .insert({
        order_id: orderId,
        driver_id: driverId,
        client_id: clientId,
      })
      .select('id')
      .single();

    if (error) throw error;

    const welcomeMessage = 'Bonjour! Je suis votre livreur. Je vous contacterai dès que je serai en route.';

    await supabase
      .from('order_messages')
      .insert({
        conversation_id: data.id,
        sender_id: (await supabase.from('drivers').select('user_id').eq('id', driverId).single()).data?.user_id,
        message: welcomeMessage,
      });

    return { success: true, conversationId: data.id };
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return { success: false, error: error.message };
  }
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const { data: driverData } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (driverData) {
      const { data: conversations } = await supabase
        .from('order_conversations')
        .select('id')
        .eq('driver_id', driverData.id);

      if (!conversations || conversations.length === 0) return 0;

      const conversationIds = conversations.map(c => c.id);

      const { count } = await supabase
        .from('order_messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', userId);

      return count || 0;
    }

    const { data: conversations } = await supabase
      .from('order_conversations')
      .select('id')
      .eq('client_id', userId);

    if (!conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map(c => c.id);

    const { count } = await supabase
      .from('order_messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', userId);

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}
