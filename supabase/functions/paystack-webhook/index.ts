import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function verifyPaystackSignature(body: string, signature: string, secret: string): boolean {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(body);
  
  return crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  )
  .then(cryptoKey => crypto.subtle.sign("HMAC", cryptoKey, data))
  .then(signatureBuffer => {
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === signature;
  })
  .catch(() => false);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      throw new Error("No signature provided");
    }

    const body = await req.text();
    const isValid = await verifyPaystackSignature(body, signature, paystackSecretKey);

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    const event = JSON.parse(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event.event === "charge.success") {
      const { data } = event;
      const orderId = data.metadata?.orderId;

      if (!orderId) {
        console.log("No order ID in webhook data");
        return new Response(JSON.stringify({ received: true }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "completed",
          payment_transaction_id: data.reference,
          payment_processed_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Failed to update order:", updateError);
        throw new Error("Failed to update order");
      }

      console.log(`Payment successful for order ${orderId}`);
    } else if (event.event === "charge.failed") {
      const { data } = event;
      const orderId = data.metadata?.orderId;

      if (!orderId) {
        console.log("No order ID in webhook data");
        return new Response(JSON.stringify({ received: true }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          payment_error_message: data.gateway_response || "Payment failed",
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Failed to update order:", updateError);
      }

      console.log(`Payment failed for order ${orderId}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Webhook processing failed",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});