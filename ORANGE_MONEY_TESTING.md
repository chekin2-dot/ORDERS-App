# Orange Money Testing Configuration

## Your Project URLs

**Supabase Project URL**: `https://gytdcxiyqoqxtwwxlwfy.supabase.co`

## Webhook URLs for Orange Money Dashboard

When registering with Orange Money or configuring your merchant account, use these exact URLs:

### 1. Notification URL (IPN - Instant Payment Notification)
```
https://gytdcxiyqoqxtwwxlwfy.supabase.co/functions/v1/orange-money-webhook
```
**Purpose**: Orange Money sends payment status updates here
**Method**: POST
**Required**: Yes

### 2. Return URL (Success)
```
https://gytdcxiyqoqxtwwxlwfy.supabase.co/functions/v1/orange-money-webhook?status=success
```
**Purpose**: User is redirected here after successful payment
**Required**: Yes

### 3. Cancel URL (Cancellation)
```
https://gytdcxiyqoqxtwwxlwfy.supabase.co/functions/v1/orange-money-webhook?status=cancelled
```
**Purpose**: User is redirected here if they cancel payment
**Required**: Yes

### 4. Payment Processing Endpoint (Internal)
```
https://gytdcxiyqoqxtwwxlwfy.supabase.co/functions/v1/process-orange-money-payment
```
**Purpose**: Your app calls this to initiate payments
**Method**: POST
**Required**: Used by your app, not by Orange Money

## IP Address Information

### If Orange Money Requires Static IP

Supabase Edge Functions use dynamic IPs from Deno Deploy. If Orange Money requires IP whitelisting:

**Option 1**: Request IP ranges from Supabase
- Contact Supabase support at: support@supabase.io
- Ask for current IP ranges for Edge Functions
- Provide these ranges to Orange Money

**Option 2**: Inform Orange Money you're using cloud services
- **Provider**: Supabase (Deno Deploy)
- **Region**: Global/Automatic
- **Note**: IPs are dynamic and managed by the cloud provider

**Option 3**: Use a proxy (if absolutely necessary)
- Set up a reverse proxy with static IP
- Forward requests to your Supabase Edge Functions
- This adds complexity and is usually not necessary

### Most Likely Scenario

Most modern payment providers (including Orange Money) don't require static IPs for webhooks. They identify legitimate requests using:
- Webhook signatures
- API keys
- Request validation

Your Edge Functions are already configured to validate incoming webhook requests.

## Credentials You Need from Orange Money

When you register, Orange Money will provide:

1. **Merchant ID**: Your unique merchant identifier
2. **Merchant Key**: Secret key for API authentication
3. **Access Token**: OAuth token for API calls
4. **API Base URL**: Typically `https://api.orange.com/orange-money-webpay/v1` (or country-specific)

## How to Update Your App with Orange Money Credentials

Once you receive credentials from Orange Money:

### Option 1: Update Edge Functions Directly (Recommended)

Your Edge Functions already have the code ready. The credentials are expected as environment variables:

```bash
# These variables are read by your Edge Functions
ORANGE_MONEY_API_URL=https://api.orange.com/orange-money-webpay/v1
ORANGE_MONEY_MERCHANT_ID=your_merchant_id_here
ORANGE_MONEY_MERCHANT_KEY=your_merchant_key_here
ORANGE_MONEY_ACCESS_TOKEN=your_access_token_here
```

These are automatically available in Supabase Edge Functions environment. You just need to obtain them from Orange.

### Option 2: Store in Supabase Dashboard (If Needed)

If you need to explicitly set them:

1. Go to Supabase Dashboard
2. Navigate to: Project Settings > Edge Functions > Secrets
3. Add each variable as a secret
4. Redeploy your Edge Functions

**Note**: Usually not needed as they're pre-configured in the function code.

## Testing Your Orange Money Integration

### Step 1: Verify Edge Functions are Deployed

```bash
# Check if functions are deployed
npx supabase functions list

# You should see:
# - process-orange-money-payment
# - orange-money-webhook
```

### Step 2: Understanding Orange Money Payment Flow

Orange Money uses a **USSD + OTP flow**, NOT a web redirect flow. Here's how it works:

1. **Customer initiates payment** in the app
2. **Customer dials USSD code** on their phone: `*144*4*6*750#`
3. **Orange Money generates OTP** and sends it via SMS
4. **Customer enters OTP** in the app along with their Orange Money phone number
5. **App sends OTP to backend** which validates with Orange Money API
6. **Payment is processed** and order status is updated

### Step 3: Test Webhook Manually (Optional)

Use curl or Postman to test your webhook:

```bash
curl -X POST https://gytdcxiyqoqxtwwxlwfy.supabase.co/functions/v1/orange-money-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESS",
    "orderId": "test-order-123",
    "transactionId": "OM-TEST-123",
    "amount": 1000
  }'
```

**Expected Response**: 200 OK with confirmation message

### Step 4: Test Payment Flow in App

1. Open the ORDERS App
2. Log in as a Client
3. Browse merchants and add items to cart
4. Click "Commander"
5. Select "Orange Money" as payment method
6. **IMPORTANT**: Before clicking "Confirmer", you need to:
   - Dial `*144*4*6*750#` on your phone with Orange Money
   - Follow prompts to generate OTP code
   - You'll receive an SMS with the OTP code (e.g., "202766")
7. Enter the OTP code in the app (e.g., "202766")
8. Enter your Orange Money phone number (e.g., "0707123456")
9. Click "Confirmer et continuer"
10. The app will process the payment using your OTP
11. If successful, you'll be redirected to select a driver
12. Check "Commandes" tab - order should show as confirmed

### Step 4: Verify in Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to: Table Editor > orders
3. Find your test order
4. Verify:
   - `payment_status` = 'completed'
   - `payment_method` = 'orange_money'
   - `orange_money_phone` = your phone number
   - `orange_money_transaction_id` = transaction ID from Orange Money

## Monitoring and Debugging

### Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to: Edge Functions > Logs
3. Select function: `orange-money-webhook` or `process-orange-money-payment`
4. Review logs for errors or successful payments

### Common Issues

**Issue 1: Webhook not receiving callbacks**
- Solution: Verify webhook URL is configured correctly in Orange Money dashboard
- Check that URL is publicly accessible
- Review Edge Function logs for incoming requests

**Issue 2: Payment marked as pending**
- Solution: Orange Money might not have sent webhook notification yet
- Check Orange Money dashboard for webhook delivery status
- Verify webhook URL is correct

**Issue 3: "Mock payment" in production**
- Solution: Orange Money credentials not configured
- Verify environment variables are set
- Redeploy Edge Functions after setting variables

**Issue 4: CORS errors**
- Solution: Edge Functions already include CORS headers
- If still seeing errors, check function logs
- Verify request is coming from your app domain

## Security Checklist

- [ ] Webhook URL is using HTTPS (✅ Supabase uses HTTPS)
- [ ] API credentials are stored server-side only (✅ In Edge Functions)
- [ ] Webhook validates incoming requests
- [ ] Payment amounts are verified server-side
- [ ] Transaction IDs are logged for reconciliation

## Support and Resources

### Orange Money Support
- Developer Portal: https://developer.orange.com/
- Documentation: https://developer.orange.com/apis/orange-money-webpay/
- Support Email: Contact via developer portal

### Supabase Support
- Dashboard: https://app.supabase.com/
- Documentation: https://supabase.com/docs/guides/functions
- Community: https://github.com/supabase/supabase/discussions

### Your Project Links
- Supabase Dashboard: https://app.supabase.com/project/gytdcxiyqoqxtwwxlwfy
- Edge Functions: https://app.supabase.com/project/gytdcxiyqoqxtwwxlwfy/functions
- Database Tables: https://app.supabase.com/project/gytdcxiyqoqxtwwxlwfy/editor

## Quick Reference

### Webhook URL (Copy-Paste Ready)
```
https://gytdcxiyqoqxtwwxlwfy.supabase.co/functions/v1/orange-money-webhook
```

### Test Credentials (Request from Orange Money)

**Test Phone Numbers**
Orange Money provides test phone numbers for sandbox testing:
- They will provide these when you register for sandbox access
- Usually in format: +225XXXXXXXX (Côte d'Ivoire)
- Or country-specific format

**Test OTP Codes**
For sandbox testing, Orange Money may provide:
- Fixed test OTP codes that always work (e.g., "123456")
- Or dynamic OTPs generated via their test USSD gateway
- Check with Orange Money documentation for current test codes

### Sandbox vs Production

**Sandbox (Testing)**
- Use sandbox API URL from Orange Money
- Use test phone numbers
- No real money is charged
- Perfect for development

**Production (Live)**
- Use production API URL from Orange Money
- Real phone numbers and payments
- Update API URL in Edge Functions
- Monitor closely for first few transactions

## Next Steps

1. **Register with Orange Money**: Apply for merchant account
2. **Receive Credentials**: Get your API keys and merchant ID
3. **Configure Webhooks**: Add webhook URLs to Orange Money dashboard
4. **Test in Sandbox**: Use test credentials and phone numbers
5. **Go Live**: Switch to production credentials when ready

---

**Questions?** Check `ORANGE_MONEY_SETUP.md` for additional setup information.
