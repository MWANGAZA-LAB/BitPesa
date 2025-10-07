import { 
  Smartphone, 
  Zap, 
  CreditCard, 
  CheckCircle,
  ArrowRight,
  QrCode,
  Phone,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const steps = [
  {
    step: 1,
    icon: Smartphone,
    title: 'Open BitPesa Bridge',
    description: 'Launch the app and scan the QR code or enter the amount you want to pay',
    color: 'text-bitcoin',
    bgColor: 'bg-bitcoin/10',
  },
  {
    step: 2,
    icon: Zap,
    title: 'Pay with Bitcoin',
    description: 'Send Bitcoin via Lightning Network to the generated invoice',
    color: 'text-bitcoin',
    bgColor: 'bg-bitcoin/10',
  },
  {
    step: 3,
    icon: CreditCard,
    title: 'Receive M-Pesa',
    description: 'Your Bitcoin is instantly converted to M-Pesa and sent to your phone',
    color: 'text-mpesa',
    bgColor: 'bg-mpesa/10',
  },
  {
    step: 4,
    icon: CheckCircle,
    title: 'Complete Payment',
    description: 'Use your M-Pesa to pay for goods and services anywhere in Kenya',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

const useCases = [
  {
    icon: QrCode,
    title: 'Scan & Pay',
    description: 'Scan QR codes at merchants to pay instantly',
    example: 'Grocery stores, restaurants, fuel stations',
  },
  {
    icon: Phone,
    title: 'Send Money',
    description: 'Send money to friends and family via M-Pesa',
    example: 'Split bills, send gifts, help family',
  },
  {
    icon: Wallet,
    title: 'Buy Airtime',
    description: 'Top up your phone or others with Bitcoin',
    example: 'Self-service, family top-ups, business',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            How It Works
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            Simple as{' '}
            <span className="text-gradient">1-2-3-4</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Convert your Bitcoin to M-Pesa in just a few simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-20">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.step} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-border transform translate-x-4 z-0" />
                )}
                
                <Card className="relative z-10 group hover:shadow-lg transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${step.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-8 w-8 ${step.color}`} />
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        Step {step.step}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription className="text-center">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Use Cases */}
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold tracking-tight sm:text-3xl mb-4">
              What can you pay for?
            </h3>
            <p className="text-lg text-muted-foreground">
              Use your Bitcoin to pay for everything M-Pesa accepts
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <Card key={useCase.title} className="group hover:shadow-lg transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                    <CardDescription className="text-center">
                      {useCase.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground text-center">
                      <strong>Examples:</strong> {useCase.example}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
