import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook data from Orange Money
    const webhookData = await req.json();
    console.log('Orange Money webhook received:', webhookData);

    const {
      order_id,
      pay_token,
      transaction_id,
      status,
      amount,
    } = webhookData;

    if (!order_id) {
      throw new Error('Missing order_id in webhook');
    }

    // Determine payment status
    let paymentStatus = 'failed';
    let errorMessage = null;

    if (status === 'SUCCESS' || status === 'SUCCESSFUL' || status === 'COMPLETED') {
      paymentStatus = 'completed';
    } else if (status === 'PENDING' || status === 'INITIATED') {
      paymentStatus = 'processing';
    } else {
      paymentStatus = 'failed';
      errorMessage = `Payment failed with status: ${status}`;
    }

    // Update order with payment status
    const updateData: any = {
      payment_status: paymentStatus,
      payment_transaction_id: transaction_id || pay_token,
    };

    if (paymentStatus === 'completed') {
      updateData.payment_processed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.payment_error_message = errorMessage;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    console.log(`Order ${order_id} payment status updated to: ${paymentStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Webhook processing failed',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});