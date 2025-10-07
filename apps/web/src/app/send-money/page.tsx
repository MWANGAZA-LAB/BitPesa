'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const sendMoneySchema = z.object({
  recipientPhone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be at most 15 digits')
    .regex(/^254\d{9}$/, 'Please enter a valid Kenyan phone number (254XXXXXXXXX)'),
  recipientName: z.string().optional(),
  amount: z.number()
    .min(10, 'Minimum amount is 10 KES')
    .max(150000, 'Maximum amount is 150,000 KES'),
  description: z.string().optional(),
});

type SendMoneyForm = z.infer<typeof sendMoneySchema>;

interface TransactionState {
  status: 'idle' | 'creating' | 'pending' | 'paid' | 'completed' | 'failed';
  paymentHash?: string;
  lightningInvoice?: string;
  qrCode?: string;
  error?: string;
  mpesaReceipt?: string;
}

export default function SendMoneyPage() {
  const [transactionState, setTransactionState] = useState<TransactionState>({ status: 'idle' });
  const [btcAmount, setBtcAmount] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SendMoneyForm>({
    resolver: zodResolver(sendMoneySchema),
  });

  const watchedAmount = watch('amount');

  // Fetch exchange rate when amount changes
  React.useEffect(() => {
    if (watchedAmount && watchedAmount > 0) {
      fetchExchangeRate(watchedAmount);
    }
  }, [watchedAmount]);

  const fetchExchangeRate = async (amount: number) => {
    try {
      const response = await fetch('/api/v1/rates/convert?from=KES&to=BTC&amount=' + amount);
      const data = await response.json();
      
      if (data.success) {
        setBtcAmount(data.data.toAmount);
        setExchangeRate(data.data.rate);
        setFee(data.data.fee);
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
    }
  };

  const onSubmit = async (data: SendMoneyForm) => {
    setTransactionState({ status: 'creating' });

    try {
      const response = await fetch('/api/v1/transactions/send-money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setTransactionState({
          status: 'pending',
          paymentHash: result.data.paymentHash,
          lightningInvoice: result.data.lightningInvoice?.paymentRequest,
          qrCode: result.data.lightningInvoice?.paymentRequest, // QR code is the same as invoice
        });

        // Start polling for payment status
        pollPaymentStatus(result.data.paymentHash);
      } else {
        setTransactionState({
          status: 'failed',
          error: result.error?.message || 'Failed to create transaction',
        });
      }
    } catch (error) {
      setTransactionState({
        status: 'failed',
        error: 'Network error. Please try again.',
      });
    }
  };

  const pollPaymentStatus = async (paymentHash: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/transactions/${paymentHash}/status`);
        const result = await response.json();

        if (result.success) {
          if (result.data.status === 'completed') {
            setTransactionState(prev => ({
              ...prev,
              status: 'completed',
              mpesaReceipt: result.data.mpesaReceiptNumber,
            }));
            clearInterval(pollInterval);
          } else if (result.data.status === 'failed') {
            setTransactionState(prev => ({
              ...prev,
              status: 'failed',
              error: 'Transaction failed',
            }));
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Failed to check payment status:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Send Money to M-Pesa
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Pay with Bitcoin Lightning and send money to any M-Pesa number
        </p>
      </div>

      {transactionState.status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>
              Enter the recipient details and amount to send
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientPhone">Recipient Phone Number *</Label>
                  <Input
                    id="recipientPhone"
                    placeholder="254XXXXXXXXX"
                    {...register('recipientPhone')}
                    className={errors.recipientPhone ? 'border-red-500' : ''}
                  />
                  {errors.recipientPhone && (
                    <p className="text-red-500 text-sm mt-1">{errors.recipientPhone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                  <Input
                    id="recipientName"
                    placeholder="John Doe"
                    {...register('recipientName')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Amount (KES) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="1000"
                  {...register('amount', { valueAsNumber: true })}
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Payment for services"
                  {...register('description')}
                />
              </div>

              {watchedAmount && watchedAmount > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Payment Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Amount (KES):</span>
                      <span>{watchedAmount.toLocaleString()} KES</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fee:</span>
                      <span>{fee.toFixed(2)} KES</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total (KES):</span>
                      <span>{(watchedAmount + fee).toLocaleString()} KES</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bitcoin Amount:</span>
                      <span>{btcAmount.toFixed(8)} BTC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Exchange Rate:</span>
                      <span>1 BTC = {exchangeRate.toLocaleString()} KES</span>
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Create Lightning Invoice
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {transactionState.status === 'creating' && (
        <Card>
          <CardContent className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Creating Transaction</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we create your Lightning invoice...
            </p>
          </CardContent>
        </Card>
      )}

      {transactionState.status === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Payment Pending
            </CardTitle>
            <CardDescription>
              Scan the QR code or copy the invoice to pay with your Lightning wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {transactionState.qrCode && (
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  {/* QR Code would be rendered here */}
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-gray-500">
                    QR Code
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Scan with your Lightning wallet
                </p>
              </div>
            )}

            {transactionState.lightningInvoice && (
              <div>
                <Label>Lightning Invoice</Label>
                <div className="flex gap-2">
                  <Input
                    value={transactionState.lightningInvoice}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(transactionState.lightningInvoice!)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <Alert>
              <AlertDescription>
                <strong>Important:</strong> This invoice expires in 5 minutes. 
                Please pay promptly to complete your transaction.
              </AlertDescription>
            </Alert>

            <div className="text-center">
              <Button
                onClick={() => window.open(`lightning:${transactionState.lightningInvoice}`)}
                className="w-full"
              >
                Open in Lightning Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {transactionState.status === 'completed' && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your payment has been processed and sent to the recipient.
            </p>
            {transactionState.mpesaReceipt && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>M-Pesa Receipt:</strong> {transactionState.mpesaReceipt}
                </p>
              </div>
            )}
            <Button
              onClick={() => setTransactionState({ status: 'idle' })}
              className="mt-4"
            >
              Send Another Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {transactionState.status === 'failed' && (
        <Card>
          <CardContent className="text-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {transactionState.error || 'An error occurred while processing your payment.'}
            </p>
            <Button
              onClick={() => setTransactionState({ status: 'idle' })}
              className="mt-4"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
