import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you would:
    // 1. Verify admin authentication
    // 2. Fetch transactions from the database
    // 3. Apply filters and pagination
    
    // For now, return mock data
    const mockTransactions = [
      {
        id: 'txn_001',
        paymentHash: 'abc123def456',
        transactionType: 'SEND_MONEY',
        status: 'completed',
        amount: 5000,
        recipientPhone: '254712345678',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        mpesaReceiptNumber: 'MPE123456789',
      },
      {
        id: 'txn_002',
        paymentHash: 'def456ghi789',
        transactionType: 'BUY_AIRTIME',
        status: 'pending',
        amount: 1000,
        recipientPhone: '254712345679',
        createdAt: new Date(Date.now() - 300000).toISOString(),
      },
      {
        id: 'txn_003',
        paymentHash: 'ghi789jkl012',
        transactionType: 'PAYBILL',
        status: 'failed',
        amount: 2500,
        recipientPhone: '254712345680',
        createdAt: new Date(Date.now() - 600000).toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockTransactions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Failed to fetch transactions' },
      },
      { status: 500 }
    );
  }
}
