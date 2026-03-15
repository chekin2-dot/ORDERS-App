# Orange Money Payment Integration Guide

This app includes Orange Money payment integration for processing customer payments. Follow this guide to configure the integration.

## Current Status

The payment system is currently set up with a **mock payment mode** for development. When Orange Money credentials are not configured, the system will simulate successful payments without actually charging customers.

## How It Works

### Payment Flow

Orange Money uses a **USSD + OTP-based payment flow**:

1. **User Checkout**: Customer selects products and clicks "Commander"
2. **Payment Method Selection**: Customer chooses Orange Money or Card payment
3. **Order Creation**: Order is created with `payment_status: 'pending'`
4. **OTP Generation**:
   - Customer dials `*144*4*6*750#` on their Orange Money phone
   - Orange Money generates and sends OTP code via SMS
5. **OTP Entry**: Customer enters:
   - The OTP code received via SMS (e.g., "202766")
   - Their Orange Money phone number
6. **Payment Processing**:
   - App sends OTP and phone number to Edge Function
   - Edge Function validates payment with Orange Money API
   - Payment is processed immediately
7. **Order Update**: Order `payment_status` is updated to 'completed' or 'processing'
8. **Driver Assignment**: Customer is redirected to assign a driver

**Note**: The webhook is used for additional payment confirmations but the primary flow is OTP-based.

### Files Involved

- **Frontend**: `app/(client)/merchant-shop.tsx` - Payment UI and order creation
- **Edge Functions**:
  - `supabase/functions/process-orange-money-payment` - Initiates payment
  - `supabase/functions/orange-money-webhook` - Handles payment confirmations
- **Database**: Payment status tracked in `orders` table

## Setting Up Real Orange Money Integration

### Step 1: Register for Orange Money Developer Account

1. Go to [Orange Developer Portal](https://developer.orange.com/)
2. Register for an account
3. Apply for Orange Money API access
4. You'll receive:
   - Merchant ID
   - Merchant Key
   - API Access Token
   - API Base URL

### Step 2: Configure Environment Variables

The Edge Functions need these environment variables (these are automatically configured in Supabase):

```
ORANGE_MONEY_API_URL=https://api.orange.com/orange-money-webpay/v1
ORANGE_MONEY_MERCHANT_ID=your_merchant_id
ORANGE_MONEY_MERCHANT_KEY=your_merchant_key
ORANGE_MONEY_ACCESS_TOKEN=your_access_token
```

**Note**: These are already set up in the Edge Functions. You just need to obtain them from Orange and they will work automatically.

### Step 3: Test the Integration

1. Make a test purchase in the app
2. Select "Orange Money" as payment method
3. **Before clicking "Confirmer"**:
   - Dial `*144*4*6*750#` on your Orange Money phone
   - Follow the prompts to generate an OTP code
   - You'll receive an SMS with the OTP (e.g., "202766")
4. Enter the OTP code in the app
5. Enter your Orange Money phone number
6. Click "Confirmer et continuer"
7. The payment will be processed immediately
8. Your order should appear in "Commandes"

### Step 4: Webhook Configuration

The webhook URL for Orange Money to send payment confirmations:

```
https://your-project.supabase.co/functions/v1/orange-money-webhook
```

Configure this URL in your Orange Money merchant dashboard as the:
- Return URL
- Cancel URL
- Notification URL

## Mock Payment Mode

While Orange Money is not configured, the system uses mock payments:

- Payments are automatically marked as successful
- No actual money is charged
- Transaction IDs are generated with prefix `MOCK_`
- Perfect for development and testing

## Card Payment

Card payment (Visa) is currently implemented as a simplified flow:
- Marks payment as completed immediately
- Generates a transaction ID
- Proceeds to driver selection

For production, you may want to integrate a real card payment gateway like:
- Stripe (via RevenueCat for mobile)
- PayPal
- Flutterwave
- Paystack

## Supported Countries

Orange Money is available in:
- Senegal
- Côte d'Ivoire
- Mali
- Burkina Faso
- Niger
- Guinea
- Cameroon
- Madagascar
- And other African countries

## Payment Status Flow

Orders go through these payment statuses:

1. **pending**: Order created, payment not yet initiated
2. **processing**: Payment initiated, waiting for confirmation
3. **completed**: Payment successful
4. **failed**: Payment failed or cancelled

## Testing Payment Webhooks Locally

To test webhook callbacks during development:

1. Use a service like [ngrok](https://ngrok.com/) to expose your local Supabase
2. Update the webhook URL in Orange Money dashboard to your ngrok URL
3. Make test payments
4. Monitor the webhook function logs in Supabase dashboard

## Security Notes

- All API keys are stored securely in Supabase Edge Functions environment
- Never expose Orange Money credentials in frontend code
- The webhook endpoint does not require JWT authentication (as it's called by Orange Money)
- Payment verification is done server-side

## Troubleshooting

### Payment not processing
- Check Edge Function logs in Supabase dashboard
- Verify environment variables are set correctly
- Ensure webhook URL is configured in Orange Money dashboard

### Webhook not receiving callbacks
- Verify the webhook URL is publicly accessible
- Check Orange Money dashboard for webhook delivery status
- Review Edge Function logs for errors

### Mock payments in production
- If seeing mock payments in production, Orange Money credentials are not configured
- Set the environment variables in Supabase dashboard

## Support

For Orange Money API support:
- Documentation: https://developer.orange.com/
- Support: Contact Orange Money developer support

For app-specific issues:
- Check Edge Function logs in Supabase dashboard
- Review database order records for payment status
