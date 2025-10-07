'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, Mail, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ReceiptData {
  receiptId: string;
  paymentHash: string;
  transactionType: string;
  amount: number;
  feeAmount: number;
  totalAmount: number;
  recipientPhone: string;
  mpesaReceiptNumber?: string;
  exchangeRate: number;
  btcAmount: number;
  timestamp: string;
  notes?: string;
  qrCode?: string;
}

interface ReceiptStatus {
  paymentHash: string;
  status: 'PENDING' | 'GENERATED' | 'SENT' | 'DELIVERED' | 'FAILED';
  receiptId: string;
  generatedAt: string;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  deliveryMethod?: string;
}

interface ReceiptProps {
  paymentHash: string;
  onClose?: () => void;
}

export default function Receipt({ paymentHash, onClose }: ReceiptProps) {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchReceiptData();
  }, [paymentHash]);

  const fetchReceiptData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/receipts/${paymentHash}`);
      const result = await response.json();

      if (result.success) {
        setReceiptData(result.data);
      } else {
        setError(result.error?.message || 'Failed to fetch receipt');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReceiptStatus = async () => {
    try {
      const response = await fetch(`/api/v1/receipts/${paymentHash}/status`);
      const result = await response.json();

      if (result.success) {
        setReceiptStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch receipt status:', error);
    }
  };

  const downloadReceipt = async (format: 'pdf' | 'html') => {
    try {
      setDownloading(true);
      
      const response = await fetch(`/api/v1/receipts/${paymentHash}/download?format=${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${paymentHash}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download receipt');
      }
    } catch (error) {
      setError('Failed to download receipt');
    } finally {
      setDownloading(false);
    }
  };

  const resendReceipt = async (method: 'email' | 'sms') => {
    try {
      setSending(true);
      
      const contactInfo = method === 'email' 
        ? { email: prompt('Enter email address:') }
        : { phoneNumber: prompt('Enter phone number:') };

      if (!contactInfo.email && !contactInfo.phoneNumber) {
        return;
      }

      const response = await fetch(`/api/v1/receipts/${paymentHash}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactInfo),
      });

      const result = await response.json();

      if (result.success) {
        await fetchReceiptStatus();
        alert('Receipt sent successfully!');
      } else {
        setError(result.error?.message || 'Failed to send receipt');
      }
    } catch (error) {
      setError('Failed to send receipt');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading receipt...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchReceiptData}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!receiptData) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p>Receipt not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payment Receipt</span>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Receipt ID: {receiptData.receiptId}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Payment Hash:</p>
              <p className="font-mono text-xs break-all">{receiptData.paymentHash}</p>
            </div>
            <div>
              <p className="font-semibold">Transaction Type:</p>
              <p>{receiptData.transactionType}</p>
            </div>
            <div>
              <p className="font-semibold">Amount:</p>
              <p className="text-lg font-bold text-green-600">
                {receiptData.amount.toLocaleString()} KES
              </p>
            </div>
            <div>
              <p className="font-semibold">Fee:</p>
              <p>{receiptData.feeAmount.toLocaleString()} KES</p>
            </div>
            <div>
              <p className="font-semibold">Total:</p>
              <p className="text-lg font-bold">
                {receiptData.totalAmount.toLocaleString()} KES
              </p>
            </div>
            <div>
              <p className="font-semibold">Bitcoin Amount:</p>
              <p>{receiptData.btcAmount} BTC</p>
            </div>
            <div>
              <p className="font-semibold">Exchange Rate:</p>
              <p>1 BTC = {receiptData.exchangeRate.toLocaleString()} KES</p>
            </div>
            <div>
              <p className="font-semibold">Recipient:</p>
              <p>{receiptData.recipientPhone}</p>
            </div>
            {receiptData.mpesaReceiptNumber && (
              <div>
                <p className="font-semibold">M-Pesa Receipt:</p>
                <p className="font-mono text-xs">{receiptData.mpesaReceiptNumber}</p>
              </div>
            )}
            <div>
              <p className="font-semibold">Date:</p>
              <p>{new Date(receiptData.timestamp).toLocaleString()}</p>
            </div>
          </div>

          {receiptData.qrCode && (
            <div className="text-center">
              <p className="font-semibold mb-2">Receipt Verification QR Code</p>
              <img 
                src={receiptData.qrCode} 
                alt="Receipt QR Code" 
                className="mx-auto w-32 h-32"
              />
            </div>
          )}

          {receiptData.notes && (
            <div>
              <p className="font-semibold">Notes:</p>
              <p className="text-sm text-gray-600">{receiptData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Actions</CardTitle>
          <CardDescription>
            Download or share your receipt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => downloadReceipt('pdf')}
              disabled={downloading}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button
              onClick={() => downloadReceipt('html')}
              disabled={downloading}
              variant="outline"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {downloading ? 'Downloading...' : 'Download HTML'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => resendReceipt('email')}
              disabled={sending}
              variant="outline"
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : 'Email Receipt'}
            </Button>
            <Button
              onClick={() => resendReceipt('sms')}
              disabled={sending}
              variant="outline"
              className="w-full"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : 'SMS Receipt'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {receiptStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Receipt Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {receiptStatus.status === 'DELIVERED' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {receiptStatus.status === 'FAILED' && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                {(receiptStatus.status === 'PENDING' || receiptStatus.status === 'GENERATED' || receiptStatus.status === 'SENT') && (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
                <span className="font-semibold">Status:</span>
                <span className="capitalize">{receiptStatus.status.toLowerCase()}</span>
              </div>
              
              {receiptStatus.deliveryMethod && (
                <div className="text-sm text-gray-600">
                  Delivery Method: {receiptStatus.deliveryMethod}
                </div>
              )}
              
              {receiptStatus.sentAt && (
                <div className="text-sm text-gray-600">
                  Sent: {new Date(receiptStatus.sentAt).toLocaleString()}
                </div>
              )}
              
              {receiptStatus.deliveredAt && (
                <div className="text-sm text-gray-600">
                  Delivered: {new Date(receiptStatus.deliveredAt).toLocaleString()}
                </div>
              )}
              
              {receiptStatus.errorMessage && (
                <Alert>
                  <AlertDescription>
                    Error: {receiptStatus.errorMessage}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
