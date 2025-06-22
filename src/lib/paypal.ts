import { PayPalOrder, PayPalConfig, PayPalPaymentRequest } from '@/types/paypal';

export class PayPalService {
    private static instance: PayPalService;
    private config: PayPalConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        this.config = {
            client_id: process.env.PAYPAL_CLIENT_ID!,
            client_secret: process.env.PAYPAL_CLIENT_SECRET!,
            mode: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
            webhook_id: process.env.PAYPAL_WEBHOOK_ID
        };
    }

    static getInstance(): PayPalService {
        if (!PayPalService.instance) {
            PayPalService.instance = new PayPalService();
        }
        return PayPalService.instance;
    }

    private getBaseUrl(): string {
        return this.config.mode === 'sandbox'
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';
    }

    private async getAccessToken(): Promise<string> {
        // Check if we have a valid token
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        // Validate configuration
        if (!this.config.client_id || !this.config.client_secret) {
            throw new Error('PayPal credentials not configured. Please check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.');
        }

        const auth = Buffer.from(`${this.config.client_id}:${this.config.client_secret}`).toString('base64');

        const response = await fetch(`${this.getBaseUrl()}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('PayPal token request failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`Failed to get PayPal access token: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        if (!data.access_token) {
            throw new Error('No access token received from PayPal');
        }
        this.accessToken = data.access_token as string;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);

        return this.accessToken;
    }

    async createOrder(paymentRequest: PayPalPaymentRequest): Promise<PayPalOrder> {
        const accessToken = await this.getAccessToken();

        const orderData = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    reference_id: paymentRequest.id,
                    amount: {
                        currency_code: 'USD',
                        value: paymentRequest.amount.toFixed(2)
                    },
                    description: paymentRequest.note,
                    custom_id: paymentRequest.receiptId
                    // Note: payee field is removed as it's not needed for basic PayPal Checkout
                }
            ],
            application_context: {
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/paypal/return`,
                cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/paypal/cancel`,
                brand_name: 'Receipt Splitter',
                user_action: 'PAY_NOW',
                shipping_preference: 'NO_SHIPPING'
            }
        };

        const response = await fetch(`${this.getBaseUrl()}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('PayPal order creation failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`Failed to create PayPal order: ${JSON.stringify(errorData)}`);
        }

        const order = await response.json();
        return order;
    }

    async captureOrder(orderId: string): Promise<PayPalOrder> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(`${this.getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to capture PayPal order: ${JSON.stringify(errorData)}`);
        }

        return await response.json();
    }

    async getOrder(orderId: string): Promise<PayPalOrder> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(`${this.getBaseUrl()}/v2/checkout/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get PayPal order: ${response.statusText}`);
        }

        return await response.json();
    }

    async refundPayment(captureId: string, amount?: number): Promise<any> {
        const accessToken = await this.getAccessToken();

        const refundData = amount ? {
            amount: {
                currency_code: 'USD',
                value: amount.toFixed(2)
            }
        } : {};

        const response = await fetch(`${this.getBaseUrl()}/v2/payments/captures/${captureId}/refund`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(refundData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to refund PayPal payment: ${JSON.stringify(errorData)}`);
        }

        return await response.json();
    }

    // Verify webhook signature
    async verifyWebhookSignature(transmissionId: string, timestamp: string, webhookId: string, body: string, certUrl: string, authAlgo: string, actualSig: string): Promise<boolean> {
        const accessToken = await this.getAccessToken();

        const verificationData = {
            auth_algo: authAlgo,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: actualSig,
            transmission_time: timestamp,
            webhook_id: webhookId,
            webhook_event: JSON.parse(body)
        };

        const response = await fetch(`${this.getBaseUrl()}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(verificationData)
        });

        if (!response.ok) {
            return false;
        }

        const result = await response.json();
        return result.verification_status === 'SUCCESS';
    }

    // Get approval URL from order
    getApprovalUrl(order: PayPalOrder): string | null {
        const approveLink = order.links.find(link => link.rel === 'approve');
        return approveLink ? approveLink.href : null;
    }

    // Check if order is completed
    isOrderCompleted(order: PayPalOrder): boolean {
        return order.status === 'COMPLETED';
    }

    // Get payment amount from order
    getOrderAmount(order: PayPalOrder): number {
        if (order.purchase_units && order.purchase_units.length > 0) {
            return parseFloat(order.purchase_units[0].amount.value);
        }
        return 0;
    }

    // Create a PayPal.Me payment link for requesting money
    async createMoneyRequest(paymentRequest: PayPalPaymentRequest): Promise<string> {
        const accessToken = await this.getAccessToken();

        // Create a simple PayPal payment link using the newer v2 API
        const orderData = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    reference_id: paymentRequest.id,
                    amount: {
                        currency_code: 'USD',
                        value: paymentRequest.amount.toFixed(2)
                    },
                    description: paymentRequest.note,
                    custom_id: paymentRequest.receiptId
                }
            ],
            application_context: {
                brand_name: 'Receipt Splitter',
                user_action: 'PAY_NOW',
                shipping_preference: 'NO_SHIPPING',
                return_url: 'https://www.paypal.com/success',
                cancel_url: 'https://www.paypal.com/cancel'
            }
        };

        const response = await fetch(`${this.getBaseUrl()}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('PayPal money request failed:', errorData);
            throw new Error(`Failed to create PayPal money request: ${JSON.stringify(errorData)}`);
        }

        const order = await response.json();

        // Get the approval URL from the order
        const approvalLink = order.links.find((link: any) => link.rel === 'approve');
        if (!approvalLink) {
            throw new Error('No approval URL found in PayPal response');
        }

        return approvalLink.href;
    }

    // Alternative: Create a simple PayPal.Me style link
    createPayPalMeLink(amount: number, note: string): string {
        // This creates a PayPal.Me style link
        // Note: This is a simplified approach - in production you'd want to use the actual PayPal.Me API
        const encodedNote = encodeURIComponent(note);
        return `https://www.paypal.com/paypalme/request?amount=${amount.toFixed(2)}&currency=USD&note=${encodedNote}`;
    }
}

export const paypalService = PayPalService.getInstance(); 