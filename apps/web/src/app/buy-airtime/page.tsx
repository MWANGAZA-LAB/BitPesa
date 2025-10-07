'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const airtimeSchema = z.object({
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be at most 15 digits')
    .regex(/^254\d{9}$/, 'Please enter a valid Kenyan phone number (254XXXXXXXXX)'),
  amount: z.number()
    .min(5, 'Minimum amount is 5 KES')
    .max(10000, 'Maximum amount is 10,000 KES'),
});

type AirtimeForm = z.infer<typeof airtimeSchema>;

interface TransactionState {
  status: 'idle' | 'creating' | 'pending' | 'paid' | 'completed' | 'failed';
  paymentHash?: string;
  lightningInvoice?: string;
  qrCode?: string;
  error?: string;
  mpesaReceipt?: string;
}

const predefinedAmounts = [50, 100, 200, 500, 1000, 2000, 5000];

export default function BuyAirtimePage() {
  const [transactionState, setTransactionState] = useState<TransactionState>({ status: 'idle' });
  const [btcAmount, setBtcAmount] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AirtimeForm>({
    resolver: zodResolver(airtimeSchema),
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

  const onSubmit = async (data: AirtimeForm) => {
    setTransactionState({ status: 'creating' });

    try {
      const response = await fetch('/api/v1/transactions/buy-airtime', {
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
          qrCode: result.data.lightningInvoice?.paymentRequest,
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
    }, 2000);

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
          Buy Airtime
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Pay with Bitcoin Lightning and buy airtime for any Kenyan number
        </p>
      </div>

      {transactionState.status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Buy Airtime</CardTitle>
            <CardDescription>
              Enter the phone number and amount to buy airtime
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  placeholder="254XXXXXXXXX"
                  {...register('phoneNumber')}
                  className={errors.phoneNumber ? 'border-red-500' : ''}
                />
                {errors.phoneNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div>
                <Label>Quick Amounts (KES)</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {predefinedAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      onClick={() => setValue('amount', amount)}
                      className={watchedAmount === amount ? 'bg-blue-500 text-white' : ''}
                    >
                      {amount}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Custom Amount (KES) *</Label>
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

              {watchedAmount && watchedAmount > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Payment Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Airtime (KES):</span>
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
                Buy Airtime with Bitcoin
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
                Please pay promptly to complete your airtime purchase.
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
            <h3 className="text-2xl font-bold text-green-600 mb-2">Airtime Purchased!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your airtime has been successfully purchased and credited to the phone number.
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
              Buy More Airtime
            </Button>
          </CardContent>
        </Card>
      )}

      {transactionState.status === 'failed' && (
        <Card>
          <CardContent className="text-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-red-600 mb-2">Purchase Failed</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {transactionState.error || 'An error occurred while processing your airtime purchase.'}
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
