import { 
  Zap, 
  Smartphone, 
  Shield, 
  Clock, 
  CreditCard, 
  Globe,
  Lock,
  TrendingUp,
  Users,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Payments processed in seconds using the Lightning Network',
    badge: 'Speed',
    color: 'text-bitcoin',
    bgColor: 'bg-bitcoin/10',
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Optimized for mobile devices with native app experience',
    badge: 'Mobile',
    color: 'text-mpesa',
    bgColor: 'bg-mpesa/10',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Your funds are protected with enterprise-grade security',
    badge: 'Security',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Clock,
    title: '24/7 Available',
    description: 'Send and receive payments anytime, anywhere',
    badge: 'Always On',
    color: 'text-accent-foreground',
    bgColor: 'bg-accent/10',
  },
  {
    icon: CreditCard,
    title: 'M-Pesa Integration',
    description: 'Pay anywhere M-Pesa is accepted in Kenya',
    badge: 'Universal',
    color: 'text-mpesa',
    bgColor: 'bg-mpesa/10',
  },
  {
    icon: Globe,
    title: 'Global Bitcoin',
    description: 'Use your Bitcoin from anywhere in the world',
    badge: 'Global',
    color: 'text-bitcoin',
    bgColor: 'bg-bitcoin/10',
  },
  {
    icon: Lock,
    title: 'Non-Custodial',
    description: 'You control your private keys and funds',
    badge: 'Self-Custody',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: TrendingUp,
    title: 'Low Fees',
    description: 'Minimal fees compared to traditional banking',
    badge: 'Affordable',
    color: 'text-accent-foreground',
    bgColor: 'bg-accent/10',
  },
];

const stats = [
  { label: 'Transaction Speed', value: '< 3 seconds', icon: Clock },
  { label: 'Success Rate', value: '99.9%', icon: CheckCircle },
  { label: 'Active Users', value: '5,000+', icon: Users },
  { label: 'Total Volume', value: '₦50M+', icon: TrendingUp },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            Everything you need to{' '}
            <span className="text-gradient">spend Bitcoin</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed to make Bitcoin payments as easy as using M-Pesa
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-16">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader className="text-center">
                  <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${feature.bgColor}`}>
                    <Icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-2">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
