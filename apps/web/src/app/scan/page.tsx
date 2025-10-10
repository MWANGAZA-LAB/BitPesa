'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, QrCode, Camera } from 'lucide-react';
import QRCode from 'qrcode.react';

const scanPaySchema = z.object({
  qrData: z.string()
    .min(1, 'QR code data is required'),
  amount: z.number()
    .min(10, 'Minimum amount is 10 KES')
    .max(150000, 'Maximum amount is 150,000 KES'),
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(12, 'Phone number must be at most 12 digits')
    .regex(/^[0-9]+$/, 'Phone number must contain only digits'),
});

type ScanPayForm = z.infer<typeof scanPaySchema>;

interface TransactionResponse {
  transactionId: string;
  btcAddress: string;
  btcAmount: number;
  kesAmount: number;
  exchangeRate: number;
  totalFees: number;
  expiresAt: string;
  qrCode: string;
}

export default function ScanPayPage() {
  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<ScanPayForm>({
    resolver: zodResolver(scanPaySchema),
  });
  
  const amount = watch('amount');
  const qrData = watch('qrData');
  
  const onSubmit = async (data: ScanPayForm) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/transactions/scan-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientPhone: data.phoneNumber,
          amount: data.amount,
          qrData: data.qrData,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }
      
      const result = await response.json();
      setTransaction(result);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, you would process the QR code image here
      // For now, we'll just simulate QR code data
      setValue('qrData', 'simulated_qr_data_from_image');
    }
  };

  const startCameraScan = () => {
    setIsScanning(true);
    // In a real implementation, you would start the camera and QR scanner here
    // For now, we'll simulate scanning
    setTimeout(() => {
      setValue('qrData', 'simulated_qr_data_from_camera');
      setIsScanning(false);
    }, 2000);
  };
  
  if (transaction) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-indigo-500" />
              Scan & Pay with Bitcoin
            </CardTitle>
            <CardDescription>
              Send {transaction.btcAmount} BTC to pay {transaction.kesAmount} KES
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <QRCode 
                value={transaction.qrCode}
                size={256}
                className="mx-auto"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Bitcoin Address</Label>
              <Input 
                value={transaction.btcAddress}
                readOnly
                className="font-mono text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Bitcoin Amount</Label>
                <p className="font-semibold">{transaction.btcAmount} BTC</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Payment Amount</Label>
                <p className="font-semibold">{transaction.kesAmount} KES</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Exchange Rate</Label>
                <p className="font-semibold">1 BTC = {transaction.exchangeRate} KES</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Fees</Label>
                <p className="font-semibold">{transaction.totalFees} KES</p>
              </div>
            </div>
            
            <Alert>
              <AlertDescription>
                ⏰ This payment expires in 15 minutes. Send the exact amount to the address above.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setTransaction(null)}
                className="flex-1"
              >
                New Transaction
              </Button>
              <Button 
                onClick={() => window.open(`/receipt/${transaction.transactionId}`, '_blank')}
                className="flex-1"
              >
                View Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-6 w-6 text-indigo-500" />
            Scan & Pay
          </CardTitle>
          <CardDescription>
            Scan QR codes to pay with Bitcoin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>QR Code Data</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or enter QR code data"
                  {...register('qrData')}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCameraScan}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.qrData && (
                <p className="text-sm text-red-500">{errors.qrData.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Upload QR Image</Label>
              <Input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="1000"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Your Phone Number</Label>
              <Input
                id="phoneNumber"
                placeholder="254700000000"
                {...register('phoneNumber')}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-500">{errors.phoneNumber.message}</p>
              )}
            </div>
            
            {amount && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Estimated Bitcoin amount: ~{(amount / 5000000).toFixed(8)} BTC
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  * Exchange rate varies. Final amount will be calculated when you create the transaction.
                </p>
              </div>
            )}
            
            {qrData && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ QR Code detected: {qrData.substring(0, 20)}...
                </p>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !qrData}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Transaction...
                </>
              ) : (
                'Pay with Bitcoin'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
