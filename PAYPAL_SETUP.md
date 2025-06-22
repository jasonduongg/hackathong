# PayPal Integration Setup

This guide will help you set up PayPal integration to enable charging your friends for items in your receipt splitting app.

## Prerequisites

1. A PayPal Developer Account
2. A Next.js application with Firebase authentication
3. Environment variables configured

## Step 1: PayPal Developer Setup

1. Go to [PayPal Developer Portal](https://developer.paypal.com/)
2. Sign in with your PayPal account or create a new one
3. Navigate to "Apps & Credentials"
4. Create a new app:
   - Click "Create App"
   - Choose "Business" app type
   - Give it a name (e.g., "Receipt Splitter")
   - Select "PayPal Checkout" as the integration type

5. Configure your app settings:
   - **App Name**: Your app name
   - **Sandbox/Live**: Start with Sandbox for testing
   - **Webhook URL**: `https://yourdomain.com/api/paypal/webhook` (for production)
   - **Return URL**: `https://yourdomain.com/api/paypal/return`
   - **Cancel URL**: `https://yourdomain.com/api/paypal/cancel`

6. Get your credentials:
   - Copy the **Client ID** and **Secret** from your app
   - Note: Use Sandbox credentials for testing, Live for production

## Step 2: Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=your_webhook_id

# Base URL for your app
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

For production, change `PAYPAL_MODE` to `live` and update `NEXT_PUBLIC_BASE_URL`.

## Step 3: Firestore Security Rules

Update your Firestore security rules to allow PayPal payment data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read all user profiles
    match /users/{userId} {
      allow read: if request.auth != null;
    }
    
    // Allow users to manage their own PayPal payments
    match /paypal_payments/{paymentId} {
      allow read, write: if request.auth != null && 
        (resource.data.requester_id == request.auth.uid || 
         resource.data.target_user_id == request.auth.uid);
    }
  }
}
```

## Step 4: Webhook Setup (Production)

For production, you need to set up PayPal webhooks:

1. In your PayPal Developer Dashboard, go to "Webhooks"
2. Click "Add Webhook"
3. Set the webhook URL to: `https://yourdomain.com/api/paypal/webhook`
4. Select the following events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
5. Copy the Webhook ID and add it to your environment variables

## Step 5: Testing the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your app and upload a receipt

3. Assign items to people

4. Click the credit card icon (💳) on any assigned receipt

5. Fill in the payment details:
   - Select the person to pay
   - Enter their PayPal email address
   - Enter the amount
   - Add a note

6. Click "Continue to PayPal" to complete the payment

## Step 6: Using the Payment Feature

### For Users Making Payments:
1. Upload a receipt and assign items to people
2. Click the credit card icon (💳) on any assigned receipt
3. Enter the recipient's PayPal email address
4. Enter the amount and note
5. Click "Continue to PayPal"
6. Complete the payment on PayPal's secure site
7. You'll be redirected back to your app

### For Users Receiving Payments:
1. Payments will appear in their PayPal account
2. They can view payment history in their PayPal dashboard
3. Payments are processed instantly

## API Endpoints

The integration includes the following API endpoints:

- `POST /api/paypal/create-order` - Creates a PayPal order
- `GET /api/paypal/return` - Handles successful payment completion
- `GET /api/paypal/cancel` - Handles payment cancellation
- `POST /api/paypal/webhook` - Receives payment notifications

## Features

### ✅ Implemented
- PayPal Checkout integration
- Secure payment processing
- Payment status tracking
- Webhook handling for payment notifications
- Integration with existing receipt assignment system
- Sandbox and Live environment support

### 🔄 Workflow
1. User clicks payment button on assigned receipt
2. User enters recipient's PayPal email and payment details
3. User is redirected to PayPal to complete payment
4. PayPal processes the payment securely
5. User is redirected back to the app
6. Payment status is updated in the database
7. Recipient receives payment in their PayPal account

## Security Considerations

- All payments are processed through PayPal's secure servers
- Webhook signatures are verified to prevent fraud
- Payment data is stored securely in Firestore
- No sensitive payment information is stored locally
- HTTPS is required for production

## Testing with Sandbox

1. Use PayPal Sandbox accounts for testing:
   - Create sandbox accounts in PayPal Developer Dashboard
   - Use sandbox email addresses for testing payments
   - Test both successful and failed payment scenarios

2. Sandbox PayPal accounts:
   - Buyer: Use the sandbox personal account
   - Seller: Use the sandbox business account

## Production Deployment

For production deployment:

1. Switch to Live mode in PayPal Developer Dashboard
2. Update environment variables:
   ```bash
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_client_secret
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   ```
3. Set up production webhooks
4. Test the complete payment flow in production
5. Monitor webhook events and payment statuses

## Troubleshooting

### Common Issues

1. **"Failed to create PayPal order" error**
   - Check that PayPal credentials are correct
   - Verify the mode (sandbox/live) matches your credentials
   - Ensure all required fields are provided

2. **"Invalid webhook signature" error**
   - Verify webhook URL is correct
   - Check that webhook events are properly configured
   - Ensure HTTPS is used in production

3. **Payment not appearing in recipient's account**
   - Verify the recipient's PayPal email is correct
   - Check payment status in PayPal Developer Dashboard
   - Ensure the recipient has a verified PayPal account

### Debug Mode

Enable debug logging by checking:
- Browser console for client-side errors
- Server logs for API errors
- PayPal Developer Dashboard for payment status
- Firestore for payment record updates

## Support

If you encounter issues:

1. Check the PayPal Developer Dashboard for payment status
2. Verify all environment variables are set correctly
3. Test with sandbox accounts first
4. Check Firestore security rules
5. Monitor webhook events in PayPal Developer Dashboard

## PayPal Fees

Note that PayPal charges fees for payments:
- Standard rate: 2.9% + $0.30 per transaction
- Fees are automatically deducted from the payment
- Recipients receive the net amount after fees

## Best Practices

1. **Always test in sandbox first**
2. **Use HTTPS in production**
3. **Verify webhook signatures**
4. **Handle payment failures gracefully**
5. **Store payment records for audit purposes**
6. **Monitor webhook events**
7. **Provide clear error messages to users** 