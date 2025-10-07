'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Camera, QrCode } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const scanQrSchema = z.object({
  qrCodeData: z.string().min(1, 'QR code data is required'),
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be at most 15 digits')
    .regex(/^254\d{9}$/, 'Please enter a valid Kenyan phone number (254XXXXXXXXX)'),
  amount: z.number()
    .min(10, 'Minimum amount is 10 KES')
    .max(150000, 'Maximum amount is 150,000 KES'),
});

type ScanQrForm = z.infer<typeof scanQrSchema>;

interface TransactionState {
  status: 'idle' | 'scanning' | 'creating' | 'pending' | 'paid' | 'completed' | 'failed';
  paymentHash?: string;
  lightningInvoice?: string;
  qrCode?: string;
  error?: string;
  mpesaReceipt?: string;
  scannedData?: string;
}

interface ParsedQrData {
  type: 'paybill' | 'till' | 'unknown';
  businessNumber?: string;
  tillNumber?: string;
  amount?: number;
  accountNumber?: string;
  reference?: string;
}

export default function ScanQrPage() {
  const [transactionState, setTransactionState] = useState<TransactionState>({ status: 'idle' });
  const [btcAmount, setBtcAmount] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [parsedQrData, setParsedQrData] = useState<ParsedQrData | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ScanQrForm>({
    resolver: zodResolver(scanQrSchema),
  });

  const watchedAmount = watch('amount');

  // Fetch exchange rate when amount changes
  useEffect(() => {
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

  const parseQrCode = (qrData: string): ParsedQrData => {
    // M-Pesa QR code format parsing
    // This is a simplified parser - in production, you'd use a proper QR code library
    try {
      const url = new URL(qrData);
      
      if (url.hostname.includes('mpesa') || url.pathname.includes('paybill')) {
        const params = new URLSearchParams(url.search);
        return {
          type: 'paybill',
          businessNumber: params.get('business') || undefined,
          amount: params.get('amount') ? parseFloat(params.get('amount')!) : undefined,
          accountNumber: params.get('account') || undefined,
          reference: params.get('reference') || undefined,
        };
      } else if (url.pathname.includes('till')) {
        const params = new URLSearchParams(url.search);
        return {
          type: 'till',
          tillNumber: params.get('till') || undefined,
          amount: params.get('amount') ? parseFloat(params.get('amount')!) : undefined,
          reference: params.get('reference') || undefined,
        };
      }
    } catch (error) {
      // Not a URL, try to parse as plain text
      if (qrData.includes('paybill') || qrData.includes('600')) {
        return { type: 'paybill' };
      } else if (qrData.includes('till') || qrData.includes('123')) {
        return { type: 'till' };
      }
    }
    
    return { type: 'unknown' };
  };

  const startCamera = async () => {
    try {
      setTransactionState({ status: 'scanning' });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setTransactionState({ 
        status: 'idle', 
        error: 'Unable to access camera. Please check permissions.' 
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setTransactionState({ status: 'idle' });
  };

  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // In a real implementation, you would use a QR code scanning library here
    // For now, we'll simulate scanning
    const simulatedQrData = 'mpesa://paybill?business=600988&account=123456&amount=1000';
    handleQrCodeScanned(simulatedQrData);
  };

  const handleQrCodeScanned = (qrData: string) => {
    const parsed = parseQrCode(qrData);
    setParsedQrData(parsed);
    setValue('qrCodeData', qrData);
    
    if (parsed.amount) {
      setValue('amount', parsed.amount);
    }
    
    stopCamera();
  };

  const onSubmit = async (data: ScanQrForm) => {
    setTransactionState({ status: 'creating' });

    try {
      const response = await fetch('/api/v1/transactions/scan-pay', {
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
          Scan QR Code
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Scan a merchant's QR code to pay with Bitcoin Lightning
        </p>
      </div>

      {transactionState.status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>QR Code Payment</CardTitle>
            <CardDescription>
              Scan a merchant's QR code or enter the QR data manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Button onClick={startCamera} className="mb-4">
                <Camera className="mr-2 h-4 w-4" />
                Scan QR Code
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Or enter QR code data manually below
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="qrCodeData">QR Code Data *</Label>
                <Input
                  id="qrCodeData"
                  placeholder="mpesa://paybill?business=600988&account=123456"
                  {...register('qrCodeData')}
                  className={errors.qrCodeData ? 'border-red-500' : ''}
                />
                {errors.qrCodeData && (
                  <p className="text-red-500 text-sm mt-1">{errors.qrCodeData.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phoneNumber">Your Phone Number *</Label>
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

              {parsedQrData && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Detected Payment Type</h3>
                  <div className="text-sm">
                    <p><strong>Type:</strong> {parsedQrData.type}</p>
                    {parsedQrData.businessNumber && (
                      <p><strong>Business Number:</strong> {parsedQrData.businessNumber}</p>
                    )}
                    {parsedQrData.tillNumber && (
                      <p><strong>Till Number:</strong> {parsedQrData.tillNumber}</p>
                    )}
                    {parsedQrData.accountNumber && (
                      <p><strong>Account:</strong> {parsedQrData.accountNumber}</p>
                    )}
                  </div>
                </div>
              )}

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
                Pay with Bitcoin
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {transactionState.status === 'scanning' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanning QR Code
            </CardTitle>
            <CardDescription>
              Point your camera at the QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-gray-100 rounded-lg"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>
            
            <div className="text-center space-y-2">
              <Button onClick={captureAndScan} className="w-full">
                <QrCode className="mr-2 h-4 w-4" />
                Capture & Scan
              </Button>
              <Button variant="outline" onClick={stopCamera} className="w-full">
                Cancel
              </Button>
            </div>
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
                Please pay promptly to complete your payment.
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
              Your payment has been processed and sent to the merchant.
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
              Scan Another QR Code
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
