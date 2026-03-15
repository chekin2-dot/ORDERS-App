import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    let reference: string | null = null;

    if (req.method === "GET") {
      reference = url.searchParams.get("reference");
    } else if (req.method === "POST") {
      const body = await req.json();
      reference = body.reference;
    }

    if (!reference) {
      throw new Error("Payment reference is required");
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status) {
      throw new Error(verifyData.message || "Failed to verify payment");
    }

    const paymentData = verifyData.data;
    const orderId = paymentData.metadata?.orderId;

    if (!orderId) {
      throw new Error("Order ID not found in payment metadata");
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (paymentData.status === "success") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "completed",
          payment_transaction_id: reference,
          payment_processed_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Failed to update order:", updateError);
        throw new Error("Failed to update order status");
      }

      if (req.method === "GET") {
        const redirectUrl = `${url.origin}/select-driver?orderId=${orderId}&verified=true`;
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            "Location": redirectUrl,
          },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          amount: paymentData.amount / 100,
          currency: paymentData.currency,
          orderId: orderId,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (paymentData.status === "failed") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          payment_error_message: paymentData.gateway_response || "Payment failed",
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Failed to update order:", updateError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          message: paymentData.gateway_response || "Payment failed",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          status: paymentData.status,
          message: "Payment is still pending",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error: any) {
    console.error("Error verifying Paystack payment:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to verify payment",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});