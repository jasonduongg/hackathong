export interface PayPalOrder {
    id: string;
    status: string;
    intent: string;
    payment_source: {
        paypal: {
            account_id: string;
            email_address: string;
            account_status: string;
            name: {
                given_name: string;
                surname: string;
            };
        };
    };
    purchase_units: PayPalPurchaseUnit[];
    create_time: string;
    update_time: string;
    links: PayPalLink[];
}

export interface PayPalPurchaseUnit {
    reference_id: string;
    amount: {
        currency_code: string;
        value: string;
    };
    description?: string;
    custom_id?: string;
    payee?: {
        email_address: string;
    };
    payments?: {
        captures: Array<{
            id: string;
            status: string;
            amount: {
                currency_code: string;
                value: string;
            };
        }>;
    };
}

export interface PayPalLink {
    href: string;
    rel: string;
    method: string;
}

export interface PayPalPaymentRequest {
    id: string;
    receiptId: string;
    requesterId: string;
    requesterName: string;
    targetUserId: string;
    targetUserName: string;
    amount: number;
    note: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
    itemName?: string;
    targetPayPalEmail?: string;
    paypalOrderId?: string;
    paypalOrder?: PayPalOrder;
}

export interface PayPalConfig {
    client_id: string;
    client_secret: string;
    mode: 'sandbox' | 'live';
    webhook_id?: string;
}

export interface PayPalWebhookEvent {
    id: string;
    event_type: string;
    create_time: string;
    resource: PayPalOrder;
}

// PayPal OAuth Types
export interface PayPalOAuthTokens {
    access_token: string;
    token_type: string;
    app_id: string;
    expires_in: number;
    nonce: string;
    scope: string;
    refresh_token?: string;
}

export interface PayPalUserProfile {
    user_id: string;
    name: string;
    given_name: string;
    family_name: string;
    payer_id: string;
    email_address: string;
    country_code: string;
    address?: {
        country_code: string;
        admin_area_1?: string;
        admin_area_2?: string;
        postal_code?: string;
    };
}

export interface PayPalConnectedAccount {
    userId: string;
    paypalUserId: string;
    email: string;
    name: string;
    connectedAt: string;
    tokens: PayPalOAuthTokens;
    isActive: boolean;
} 