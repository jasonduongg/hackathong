export interface ReceiptSubItem {
    name: string;
    price?: string;
    tax_price?: string;
    crv_price?: string;
    is_crv?: boolean;
}

export interface ReceiptItem {
    name: string;
    price: string;
    total_line_price?: string;
    crv_price?: string;
    tax_price?: string;
    quantity?: string;
    subitems?: ReceiptSubItem[];
    total_tax_price?: string;
    // Assignment fields
    assignedTo?: string[]; // Array of user IDs assigned to this item
    assignedAmounts?: { [userId: string]: number }; // Amount each person owes for this item
}

export interface ReceiptData {
    store_name: string;
    date: string;
    time?: string; // Time of purchase (e.g., '8:00 AM', '2:30 PM')
    total_amount: string;
    items: ReceiptItem[];
    tax_amount: string;
    gratuity?: string;
    gratuity_rate?: string;
    subtotal: string;
    tax_rate?: string;
}

export interface PartyReceipt {
    id: string;
    partyId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    s3Key: string;
    s3Bucket: string;
    downloadURL: string;
    analysis: ReceiptData;
    rawResponse: string;
    uploadedAt: any;
    displayName?: string; // User-friendly display name for the receipt
    // Assignment fields
    isAssigned?: boolean; // Whether items have been assigned to people
    memberAmounts?: { [userId: string]: number }; // Total amount each member owes
    paidBy?: string; // User ID of who paid for the receipt
} 