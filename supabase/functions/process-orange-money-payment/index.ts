import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentRequest {
  amount: number;
  orderId: string;
  customerPhone: string;
  otp: string;
  description?: string;
}

const OM_ERROR_MESSAGES: Record<string, string> = {
  '08': 'Montant de transaction incorrect.',
  '00042': 'Le montant doit être un multiple de la valeur configurée.',
  '00043': 'Montant non configuré dans le système.',
  '00075': 'Vous n\'êtes pas autorisé à accéder à ce service.',
  '409': 'Montant inférieur au minimum autorisé.',
  '00409': 'Montant inférieur au minimum autorisé.',
  '410': 'Montant supérieur au maximum autorisé.',
  '00410': 'Montant supérieur au maximum autorisé.',
  '60011': 'Vous avez atteint votre nombre maximum de transactions pour aujourd\'hui.',
  '60014': 'Vous avez atteint votre montant maximum de transactions pour aujourd\'hui.',
  '60019': 'Solde insuffisant. 5 transferts invalides successifs bloqueront votre portefeuille.',
  '60030': 'Le destinataire a atteint sa limite de solde maximum.',
  '02117': 'Compte bloqué. Contactez le service client.',
  '99990': 'Montant supérieur à votre solde disponible.',
  '99996': 'Votre portefeuille est suspendu.',
  '990413': 'Code OTP incorrect.',
  '990416': 'Code OTP incorrect.',
  '990417': 'Code OTP inexistant.',
  '990418': 'Code OTP déjà utilisé.',
  '990422': 'Numéro de téléphone invalide.',
};

function getErrorMessage(errorCode: string): string {
  return OM_ERROR_MESSAGES[errorCode] || `Échec du paiement Orange Money (code: ${errorCode}). Vérifiez votre code OTP et réessayez.`;
}

function buildXmlRequest(params: {
  customerMsisdn: string;
  merchantMsisdn: string;
  apiUsername: string;
  apiPassword: string;
  amount: number;
  otp: string;
  referenceNumber: string;
  extTxnId: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<COMMAND>
  <TYPE>OMPREQ</TYPE>
  <customer_msisdn>${params.customerMsisdn}</customer_msisdn>
  <merchant_msisdn>${params.merchantMsisdn}</merchant_msisdn>
  <api_username>${params.apiUsername}</api_username>
  <api_password>${params.apiPassword}</api_password>
  <amount>${params.amount}</amount>
  <PROVIDER>101</PROVIDER>
  <PROVIDER2>101</PROVIDER2>
  <PAYID>12</PAYID>
  <PAYID2>12</PAYID2>
  <otp>${params.otp}</otp>
  <reference_number>${params.referenceNumber}</reference_number>
  <ext_txn_id>${params.extTxnId}</ext_txn_id>
</COMMAND>`;
}

function parseXmlValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
  return match ? match[1].trim() : null;
}

async function postXmlViaFixie(
  url: string,
  xmlBody: string,
  fixieUrl: string
): Promise<{ statusCode: number; body: string }> {
  const parsedFixie = new URL(fixieUrl);
  const proxyHost = parsedFixie.hostname;
  const proxyPort = parseInt(parsedFixie.port || '80');
  const proxyUser = parsedFixie.username;
  const proxyPass = parsedFixie.password;

  const targetUrl = new URL(url);
  const isHttps = targetUrl.protocol === 'https:';
  const targetHost = targetUrl.hostname;
  const targetPort = parseInt(targetUrl.port || (isHttps ? '443' : '80'));

  const proxyAuth = btoa(`${proxyUser}:${proxyPass}`);
  const encoder = new TextEncoder();
  const bodyBytes = encoder.encode(xmlBody);

  const buildHttpRequest = (path: string): string => {
    return [
      `POST ${path} HTTP/1.1`,
      `Host: ${targetHost}`,
      `Content-Type: text/xml; charset=UTF-8`,
      `Content-Length: ${bodyBytes.length}`,
      `Connection: close`,
      ``,
      xmlBody,
    ].join('\r\n');
  };

  const readAll = async (conn: Deno.Conn): Promise<string> => {
    const chunks: Uint8Array[] = [];
    const buf = new Uint8Array(8192);
    let n: number | null;
    while ((n = await conn.read(buf)) !== null) {
      chunks.push(buf.slice(0, n));
    }
    const total = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
    let offset = 0;
    for (const c of chunks) {
      total.set(c, offset);
      offset += c.length;
    }
    return new TextDecoder().decode(total);
  };

  const parseResponse = (raw: string): { statusCode: number; body: string } => {
    const [headerSection, ...bodyParts] = raw.split('\r\n\r\n');
    const statusLine = headerSection.split('\r\n')[0];
    const statusCode = parseInt(statusLine.split(' ')[1]) || 0;
    return { statusCode, body: bodyParts.join('\r\n\r\n') };
  };

  if (isHttps) {
    const conn = await Deno.connect({ hostname: proxyHost, port: proxyPort });
    const connectReq = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\nProxy-Authorization: Basic ${proxyAuth}\r\n\r\n`;
    await conn.write(encoder.encode(connectReq));

    const buf = new Uint8Array(4096);
    await conn.read(buf);
    const connectResponse = new TextDecoder().decode(buf);
    if (!connectResponse.includes('200')) {
      conn.close();
      throw new Error(`Proxy CONNECT failed: ${connectResponse.split('\r\n')[0]}`);
    }

    const tlsConn = await Deno.startTls(conn, { hostname: targetHost });
    const httpReq = buildHttpRequest(targetUrl.pathname + targetUrl.search);
    await tlsConn.write(encoder.encode(httpReq));
    const raw = await readAll(tlsConn);
    tlsConn.close();
    return parseResponse(raw);
  } else {
    const conn = await Deno.connect({ hostname: proxyHost, port: proxyPort });
    const httpReq = [
      `POST ${url} HTTP/1.1`,
      `Host: ${targetHost}`,
      `Proxy-Authorization: Basic ${proxyAuth}`,
      `Content-Type: text/xml; charset=UTF-8`,
      `Content-Length: ${bodyBytes.length}`,
      `Connection: close`,
      ``,
      xmlBody,
    ].join('\r\n');
    await conn.write(encoder.encode(httpReq));
    const raw = await readAll(conn);
    conn.close();
    return parseResponse(raw);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const paymentData: PaymentRequest = await req.json();
    const { amount, orderId, customerPhone, otp } = paymentData;

    if (!amount || !orderId || !customerPhone) throw new Error('Champs de paiement manquants');
    if (!otp) throw new Error('Code OTP requis pour le paiement Orange Money');

    const merchantMsisdn = Deno.env.get('ORANGE_MONEY_MERCHANT_MSISDN');
    const apiUsername = Deno.env.get('ORANGE_MONEY_API_USERNAME');
    const apiPassword = Deno.env.get('ORANGE_MONEY_API_PASSWORD');
    const proxyUrl = Deno.env.get('ORANGE_MONEY_PROXY_URL');
    const proxySecret = Deno.env.get('ORANGE_MONEY_PROXY_SECRET');

    if (!merchantMsisdn || !apiUsername || !apiPassword) {
      const mockTransactionId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await supabase.from('orders').update({
        payment_status: 'completed',
        payment_transaction_id: mockTransactionId,
        payment_processed_at: new Date().toISOString(),
      }).eq('id', orderId);

      return new Response(JSON.stringify({
        success: true,
        transactionId: mockTransactionId,
        status: 'completed',
        message: 'Paiement simulé (Orange Money non configuré)',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const extTxnId = `${Date.now()}`;
    const referenceNumber = `ORD${orderId.replace(/-/g, '').substring(0, 12)}`;

    const xmlBody = buildXmlRequest({
      customerMsisdn: customerPhone,
      merchantMsisdn,
      apiUsername,
      apiPassword,
      amount,
      otp,
      referenceNumber,
      extTxnId,
    });

    let statusCode: number;
    let responseBody: string;

    if (proxyUrl && proxySecret) {
      console.log('Routing XML-RPC request through mTLS proxy server');
      const proxyRes = await fetch(`${proxyUrl}/orange-money/payment-node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8',
          'x-proxy-secret': proxySecret,
        },
        body: xmlBody,
      });
      statusCode = proxyRes.status;
      responseBody = await proxyRes.text();
    } else {
      const omDirectUrl = Deno.env.get('ORANGE_MONEY_API_URL') || 'https://apiom.orange.bf/payment';
      console.log('WARNING: No proxy configured - calling Orange Money directly (no mTLS cert)');
      const res = await fetch(omDirectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
        body: xmlBody,
      });
      statusCode = res.status;
      responseBody = await res.text();
    }

    console.log('Orange Money response status:', statusCode);
    console.log('Orange Money response body:', responseBody);

    const omStatus = parseXmlValue(responseBody, 'status');
    const omMessage = parseXmlValue(responseBody, 'message');
    const omTransId = parseXmlValue(responseBody, 'transID');

    if (omStatus === '200') {
      await supabase.from('orders').update({
        payment_status: 'completed',
        payment_transaction_id: omTransId || extTxnId,
        payment_processed_at: new Date().toISOString(),
      }).eq('id', orderId);

      return new Response(JSON.stringify({
        success: true,
        transactionId: omTransId || extTxnId,
        status: 'completed',
        message: 'Paiement effectué avec succès',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const errorCode = omStatus || String(statusCode);
    const friendlyMessage = getErrorMessage(errorCode);

    await supabase.from('orders').update({
      payment_status: 'failed',
      payment_error_message: omMessage || friendlyMessage,
    }).eq('id', orderId);

    throw new Error(friendlyMessage);

  } catch (error: any) {
    console.error('Payment processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Échec du traitement du paiement',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
