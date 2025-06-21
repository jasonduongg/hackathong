import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToS3 } from '@/lib/s3';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const partyId = formData.get('partyId') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!partyId) {
            return NextResponse.json(
                { error: 'Party ID is required' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        let buffer = Buffer.from(new Uint8Array(bytes));

        // Convert HEIC/HEIF to JPEG if needed
        if (file.type === 'image/heic' || file.type === 'image/heif') {
            return NextResponse.json(
                { error: 'HEIC/HEIF files are not supported. Please convert your image to JPEG, PNG, or WebP format before uploading.' },
                { status: 400 }
            );
        }

        // Upload file to S3
        const uploadResult = await uploadToS3(
            buffer,
            file.name,
            partyId,
            file.type
        );

        // Convert file to base64 for Anthropic analysis
        const base64Image = buffer.toString('base64');

        // Determine MIME type for Anthropic API (only supported formats)
        let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        switch (file.type) {
            case 'image/jpeg':
            case 'image/jpg':
            case 'image/heic':
            case 'image/heif':
                mediaType = 'image/jpeg'; // Convert HEIC to JPEG
                break;
            case 'image/png':
                mediaType = 'image/png';
                break;
            case 'image/gif':
                mediaType = 'image/gif';
                break;
            case 'image/webp':
                mediaType = 'image/webp';
                break;
            default:
                mediaType = 'image/jpeg'; // Default fallback
        }

        // Analyze receipt using Claude
        const message = await anthropic.messages.create({
            model: 'claude-opus-4-20250514',
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Please analyze this receipt and extract the following information in JSON format:
              {
                "store_name": "Store name",
                "date": "Date of purchase",
                "total_amount": "Total amount",
                "items": [
                  {
                    "name": "Item name",
                    "price": "Total line price",
                    "quantity": "Quantity (if available)"
                  }
                ],
                "tax_amount": "Tax amount (if available)",
                "gratuity": "Gratuity or tip amount (if available)",
                "tax_rate": "Tax rate as a percentage (e.g., '9.875%')",
                "gratuity_rate": "Gratuity rate as a percentage (e.g., '20%')",
                "subtotal": "Subtotal (if available). This may be labeled 'Subtotal', 'COUNTER-Take Out', etc."
              }
              
              IMPORTANT: Only extract information that is clearly visible and readable on the receipt. Do not guess, estimate, or hallucinate any values. If information is unclear, blurry, or not visible, mark it as "N/A".
              
              ITEM EXTRACTION RULES:
              1.  **Line Item:** Each line with a price is a distinct item. Extract it as is.
              2.  **Quantity and Price:** For a line like "2 Cheeseburger ... 7.70", the quantity is "2" and the price is "7.70". You MUST extract the total line price (7.70), not the per-unit price. The backend will calculate the per-unit price.
              3.  **Modifiers:** A modifier is a line of text immediately following an item that does NOT have a price (e.g., "+ Onion", "Extra Well").
                  - Append the modifier text to the name of the item directly above it.
                  - Example: If "1 Cheeseburger ... 3.85" is followed by "+ Onion", the item name becomes "Cheeseburger + Onion", and the price for the combined item remains "3.85".
              
              MATHEMATICAL CONSISTENCY (VERY IMPORTANT):
              1.  **Item Sum vs. Subtotal:** The sum of all extracted "price" fields from the items list MUST EQUAL the receipt's "subtotal" field. This is not optional. If your initial extraction does not sum up correctly, you MUST go back, re-examine the receipt for OCR errors on prices or missed items, and correct your extraction until the math is perfect. Do not invent or adjust prices arbitrarily; the correct prices are on the receipt.
              2.  **Totals Sum vs. Grand Total:** The sum of "subtotal" + "tax_amount" + "gratuity" (if present) MUST EQUAL the "total_amount". If they do not match, adjust the values to ensure they are mathematically correct, prioritizing the accuracy of the total_amount. For example, if subtotal is 207.00, gratuity is 40.75 and total is 270.98, the tax MUST be 23.23, even if it looks like 20.23 on the receipt.
              
              Your primary goal is to ensure the itemized breakdown is mathematically consistent with the receipt's totals.`
                        },
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
        });

        // Extract the JSON response
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

        // Function to calculate subtotal from items
        const calculateSubtotal = (items: any[]): number => {
            return items.reduce((sum, item) => {
                const basePrice = parseFloat(item.price?.replace(/[^0-9.-]/g, '') || '0');
                const quantity = parseInt(item.quantity?.replace(/[^0-9]/g, '') || '1');

                const totalPricePerItem = basePrice;
                return sum + (totalPricePerItem * quantity);
            }, 0);
        };

        // Try to parse JSON from the response
        let parsedData;
        try {
            // Look for JSON in the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);

                const totalTax = parseFloat(parsedData.tax_amount?.replace(/[^0-9.-]/g, '') || '0');
                const taxableSubtotal = parseFloat(parsedData.subtotal?.replace(/[^0-9.-]/g, '') || '0');

                // Determine the tax rate
                const taxRateString = parsedData.tax_rate?.replace(/[^0-9.-]/g, '') || '';
                let taxRate = parseFloat(taxRateString);
                if (taxRate > 1) {
                    taxRate = taxRate / 100; // Convert percentage to decimal
                }
                if (isNaN(taxRate) || taxRate === 0) {
                    taxRate = (totalTax > 0 && taxableSubtotal > 0) ? totalTax / taxableSubtotal : 0;
                }

                // Finalize item details - keep the total line price as is
                parsedData.items.forEach((item: any) => {
                    const quantity = parseInt(item.quantity?.replace(/[^0-9]/g, '') || '1');
                    const linePrice = parseFloat(item.price?.replace(/[^0-9.-]/g, '') || '0');

                    // Calculate per-item price for tax calculation
                    const perItemBasePrice = (linePrice / quantity);
                    const perItemTax = perItemBasePrice * taxRate;

                    // Keep the total line price, but add per-item price for tax calculation
                    item.total_line_price = linePrice.toFixed(2);
                    item.price = perItemBasePrice.toFixed(2); // Per-item price for display
                    item.tax_price = perItemTax.toFixed(2);

                    item.subitems = [];
                    for (let i = 0; i < quantity; i++) {
                        item.subitems.push({
                            name: `${item.name}${quantity > 1 ? ` (${i + 1})` : ''}`,
                            price: item.price,
                            tax_price: item.tax_price
                        });
                    }
                });
            } else {
                // If no JSON found, create a structured response
                parsedData = {
                    raw_response: responseText,
                    store_name: 'N/A',
                    date: 'N/A',
                    total_amount: 'N/A',
                    items: [],
                    tax_amount: 'N/A',
                    tax_rate: 'N/A',
                    subtotal: 'N/A'
                };
            }
        } catch (parseError) {
            parsedData = {
                raw_response: responseText,
                store_name: 'N/A',
                date: 'N/A',
                total_amount: 'N/A',
                items: [],
                tax_amount: 'N/A',
                tax_rate: 'N/A',
                subtotal: 'N/A'
            };
        }

        // Store the receipt analysis in Firestore
        const receiptData = {
            partyId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            s3Key: uploadResult.key,
            s3Bucket: uploadResult.bucket,
            downloadURL: uploadResult.url,
            analysis: parsedData,
            rawResponse: responseText,
            uploadedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'receipts'), receiptData);

        return NextResponse.json({
            success: true,
            data: parsedData,
            raw_response: responseText,
            receiptId: docRef.id,
            downloadURL: uploadResult.url,
            s3Key: uploadResult.key
        });

    } catch (error) {
        console.error('Error analyzing receipt:', error);
        return NextResponse.json(
            { error: 'Failed to analyze receipt' },
            { status: 500 }
        );
    }
} 