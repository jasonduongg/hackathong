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
}

export interface ReceiptData {
    store_name: string;
    date: string;
    total_amount: string;
    items: ReceiptItem[];
    tax_amount: string;
    gratuity?: string;
    gratuity_rate?: string;
    subtotal: string;
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
} 