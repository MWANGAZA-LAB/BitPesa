import { Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Basic',
    price: 'Free',
    description: 'Perfect for trying out BitPesa Bridge',
    features: [
      'Up to ₦10,000 per transaction',
      'Up to ₦50,000 per day',
      'Basic support',
      'Mobile app access',
      'QR code payments',
    ],
    limitations: [
      'No priority support',
      'Standard processing times',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₦500',
    description: 'Best for regular users and small businesses',
    features: [
      'Up to ₦100,000 per transaction',
      'Up to ₦500,000 per day',
      'Priority support',
      'Advanced analytics',
      'Bulk payments',
      'API access',
      'Custom branding',
    ],
    limitations: [],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large businesses and high-volume users',
    features: [
      'Unlimited transaction amounts',
      'Unlimited daily volume',
      'Dedicated support',
      'Custom integrations',
      'White-label solution',
      'SLA guarantee',
      'Onboarding assistance',
    ],
    limitations: [],
    cta: 'Contact Sales',
    popular: false,
  },
];

const fees = [
  {
    type: 'Lightning Network',
    fee: '0.1%',
    description: 'Minimal fees for Lightning payments',
  },
  {
    type: 'M-Pesa',
    fee: '1%',
    description: 'Standard M-Pesa transaction fees',
  },
  {
    type: 'Exchange Rate',
    fee: '2.5%',
    description: 'Competitive exchange rate spread',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            Simple, transparent{' '}
            <span className="text-gradient">pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your needs. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative group hover:shadow-lg transition-all duration-300 ${
                plan.popular ? 'ring-2 ring-primary shadow-glow' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-4xl font-bold text-foreground mb-2">
                  {plan.price}
                </div>
                <CardDescription className="text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{limitation}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Fee Structure */}
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold tracking-tight sm:text-3xl mb-4">
              Transparent fee structure
            </h3>
            <p className="text-lg text-muted-foreground">
              No hidden fees, no surprises. Here's exactly what you pay:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {fees.map((fee) => (
              <Card key={fee.type} className="text-center group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg">{fee.type}</CardTitle>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {fee.fee}
                  </div>
                  <CardDescription>
                    {fee.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              * All fees are calculated and displayed before you confirm your transaction
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
