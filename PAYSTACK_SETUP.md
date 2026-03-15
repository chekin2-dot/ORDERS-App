# Paystack Payment Integration Setup Guide

This guide explains how to set up and use Paystack payment integration for card payments in your delivery app.

## What is Paystack?

Paystack is a modern payment platform for businesses in Africa, making it easy to accept card payments (Visa, Mastercard, Verve), bank transfers, mobile money, and more. It's particularly popular in West Africa with excellent support for Nigerian Naira (NGN) and other African currencies.

## Features Implemented

- **Secure Card Payments**: Accept Visa, Mastercard, Verve, and other major cards
- **3D Secure Support**: Automatic handling of additional security verification
- **Payment Verification**: Real-time payment status updates
- **Webhook Integration**: Automatic order updates when payments complete
- **Mobile & Web Support**: Works seamlessly on both platforms

## Setup Instructions

### Step 1: Create a Paystack Account

1. Visit [https://paystack.com/](https://paystack.com/)
2. Click "Get Started" and create your account
3. Complete the business verification process
4. Once verified, you'll have access to your dashboard

### Step 2: Get Your API Keys

1. Log in to your [Paystack Dashboard](https://dashboard.paystack.com/)
2. Go to **Settings** → **API Keys & Webhooks**
3. You'll see two keys:
   - **Test Secret Key** (starts with `sk_test_`) - for testing
   - **Live Secret Key** (starts with `sk_live_`) - for production

**Important:** Never share your secret keys publicly or commit them to version control!

### Step 3: Configure Environment Variables

Add your Paystack secret key to your `.env` file:

```env
PAYSTACK_SECRET_KEY=sk_test_your_test_key_here
```

For production, replace with your live key:

```env
PAYSTACK_SECRET_KEY=sk_live_your_live_key_here
```

### Step 4: Set Up Webhooks (Important!)

Webhooks allow Paystack to notify your app when payment events occur (success, failure, etc.).

1. In your Paystack Dashboard, go to **Settings** → **API Keys & Webhooks**
2. Scroll to the **Webhooks** section
3. Click **Add Endpoint**
4. Enter your webhook URL:
   ```
   https://your-project-url.supabase.co/functions/v1/paystack-webhook
   ```
5. Save the webhook endpoint

**Note:** Replace `your-project-url` with your actual Supabase project URL from your `.env` file.

## How It Works

### Payment Flow

1. **Customer Selects Items**: User adds products to cart
2. **Choose Payment Method**: User selects "Carte Bancaire" (Card Payment)
3. **Initialize Payment**: App calls Paystack to create a payment session
4. **Enter Card Details**: User is redirected to Paystack's secure payment page
5. **Complete Payment**: User enters card details and completes payment
6. **Verification**: Paystack verifies the payment and sends confirmation
7. **Order Update**: Order status is automatically updated to "completed"
8. **Select Driver**: User is redirected to select a delivery driver

### Edge Functions

The integration uses three Edge Functions:

#### 1. `initialize-paystack-payment`
- Creates a payment session with Paystack
- Returns authorization URL for payment
- Updates order status to "processing"

#### 2. `verify-paystack-payment`
- Verifies payment status after completion
- Updates order with payment confirmation
- Handles payment success/failure

#### 3. `paystack-webhook`
- Receives webhook notifications from Paystack
- Automatically updates order status
- Validates webhook signatures for security

## Testing

### Test Cards

Paystack provides test cards for development:

**Success:**
- Card Number: `4084084084084081`
- CVV: Any 3 digits
- Expiry: Any future date
- PIN: `0000`
- OTP: `123456`

**Decline:**
- Card Number: `4084084084084084`
- Other details: Same as above

### Test Mode vs Live Mode

- **Test Mode**: Use test keys (sk_test_...) for development
- **Live Mode**: Use live keys (sk_live_...) only in production
- Always test thoroughly before switching to live mode

## Currency Support

The current implementation uses Nigerian Naira (NGN) by default. To change the currency:

1. Open `app/(client)/merchant-shop.tsx`
2. Find the Paystack initialization call
3. Change the `currency` field:

```typescript
body: JSON.stringify({
  amount: finalTotal,
  email: userProfile?.phone_number ? `${userProfile.phone_number}@app.com` : user.email || '',
  orderId: order.id,
  currency: 'GHS', // Change to GHS for Ghana Cedis, ZAR for South African Rand, etc.
}),
```

**Supported Currencies:**
- NGN (Nigerian Naira)
- GHS (Ghanaian Cedi)
- ZAR (South African Rand)
- USD (US Dollar)
- And more - check Paystack documentation

## Security Features

### Payment Verification
Every payment is verified server-side to prevent fraud. The app:
1. Creates payment with metadata (order ID, user ID)
2. Verifies payment status via Paystack API
3. Updates order only after confirmation

### Webhook Signature Validation
All webhook requests are validated using HMAC-SHA512 signatures to ensure they come from Paystack.

### Database Security
Payment updates use Row Level Security (RLS) policies to ensure:
- Only the order owner can initialize payments
- Only verified payments update order status
- Payment data is protected

## Troubleshooting

### Payment Not Completing

1. Check your webhook is properly configured
2. Verify the `PAYSTACK_SECRET_KEY` is correct
3. Check Edge Function logs for errors
4. Ensure you're using the correct test cards

### Webhook Not Receiving Events

1. Verify webhook URL is correct and accessible
2. Check webhook endpoint is not behind authentication
3. Test webhook using Paystack Dashboard's "Send Test Event"

### Currency Mismatch Errors

1. Ensure the currency in your code matches your account's supported currencies
2. NGN is recommended for West African markets
3. Contact Paystack support to enable additional currencies

### Amount Issues

Remember: Paystack expects amounts in the smallest currency unit (kobo for NGN):
- 1 NGN = 100 kobo
- The app automatically multiplies by 100 before sending to Paystack

## Production Checklist

Before going live:

- [ ] Replace test secret key with live secret key
- [ ] Update webhook URL to production domain
- [ ] Test with real card (small amount)
- [ ] Verify webhook events are received
- [ ] Check order status updates correctly
- [ ] Ensure email notifications work
- [ ] Review Paystack dashboard for test transactions

## API References

- **Paystack API Documentation**: [https://paystack.com/docs/api/](https://paystack.com/docs/api/)
- **Paystack Libraries**: [https://paystack.com/docs/libraries-and-plugins/](https://paystack.com/docs/libraries-and-plugins/)
- **Webhook Events**: [https://paystack.com/docs/payments/webhooks/](https://paystack.com/docs/payments/webhooks/)

## Support

For Paystack-specific issues:
- Email: support@paystack.com
- Twitter: @PaystackHQ
- Documentation: https://paystack.com/docs/

## Additional Features (Optional)

### Split Payments
Automatically split payments between merchant and platform:
- Set up subaccounts for each merchant
- Configure split payment rules
- Merchants receive payments directly

### Recurring Payments
For subscription-based services:
- Create subscription plans
- Charge customers automatically
- Manage subscriptions via API

### Bank Transfers
Allow customers to pay via bank transfer:
- Enable in Paystack Dashboard
- System generates unique account numbers
- Automatic payment verification

---

**Note:** This integration is production-ready but always test thoroughly with your specific use case before going live.
