import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerPhone: string;
  otp: string;
  description: string;
}

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const paymentData: PaymentRequest = await req.json();
    const { amount, currency, orderId, customerPhone, otp, description } = paymentData;

    if (!amount || !currency || !orderId || !customerPhone) {
      throw new Error('Missing required payment fields');
    }

    if (!otp) {
      throw new Error('Code OTP requis pour le paiement Orange Money');
    }

    const orangeMoneyApiUrl = Deno.env.get('ORANGE_MONEY_API_URL') || 'https://api.orange.com/orange-money-webpay/dev/v1';
    const merchantId = Deno.env.get('ORANGE_MONEY_MERCHANT_ID');
    const merchantKey = Deno.env.get('ORANGE_MONEY_MERCHANT_KEY');
    const accessToken = Deno.env.get('ORANGE_MONEY_ACCESS_TOKEN');
    const proxyUrl = Deno.env.get('ORANGE_MONEY_PROXY_URL');
    const proxySecret = Deno.env.get('ORANGE_MONEY_PROXY_SECRET');

    if (!merchantId || !merchantKey || !accessToken) {
      const mockTransactionId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          payment_transaction_id: mockTransactionId,
          payment_processed_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: mockTransactionId,
          status: 'completed',
          message: 'Mock payment successful (Orange Money not configured)',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const paymentPayload = {
      merchant_key: merchantKey,
      currency: currency,
      order_id: orderId,
      amount: amount,
      customer_msisdn: customerPhone,
      otp_code: otp,
      lang: 'fr',
      reference: `ORDER_${orderId}`,
    };

    let orangeResponse: Response;

    if (proxyUrl && proxySecret) {
      orangeResponse = await fetch(`${proxyUrl}/orange-money/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-proxy-secret': proxySecret,
        },
        body: JSON.stringify({
          apiUrl: orangeMoneyApiUrl,
          accessToken: accessToken,
          payload: paymentPayload,
        }),
      });
    } else {
      orangeResponse = await fetch(`${orangeMoneyApiUrl}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(paymentPayload),
      });
    }

    if (!orangeResponse.ok) {
      const errorText = await orangeResponse.text();
      console.error('Orange Money API error:', errorText);

      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          payment_error_message: `API Error: ${orangeResponse.status}`,
        })
        .eq('id', orderId);

      throw new Error(`Échec du paiement Orange Money. Vérifiez votre code OTP et réessayez.`);
    }

    const orangeData = await orangeResponse.json();

    const paymentStatus = orangeData.status === 'SUCCESS' || orangeData.status === 'SUCCESSFUL'
      ? 'completed'
      : 'processing';

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_transaction_id: orangeData.transaction_id || orangeData.txnid,
        payment_processed_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: orangeData.transaction_id || orangeData.txnid,
        status: paymentStatus,
        message: paymentStatus === 'completed'
          ? 'Paiement effectué avec succès'
          : 'Paiement en cours de traitement',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment processing failed',
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
