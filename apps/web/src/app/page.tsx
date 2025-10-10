'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Wifi, 
  CreditCard, 
  ShoppingCart, 
  QrCode,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    icon: Smartphone,
    title: 'Send Money',
    description: 'Send Bitcoin to any M-Pesa number',
    href: '/send',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  {
    icon: Wifi,
    title: 'Buy Airtime',
    description: 'Top up mobile phone credit',
    href: '/airtime',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    icon: CreditCard,
    title: 'Pay Bills',
    description: 'Pay utility bills and services',
    href: '/paybill',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
  {
    icon: ShoppingCart,
    title: 'Buy Goods',
    description: 'Pay at merchants and shops',
    href: '/till',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  {
    icon: QrCode,
    title: 'Scan & Pay',
    description: 'Scan QR codes to pay',
    href: '/scan',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
  },
];

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Payments processed in seconds using MinMo',
    badge: 'Speed',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'No signup required, anonymous transactions',
    badge: 'Privacy',
  },
  {
    icon: Globe,
    title: 'Global Bitcoin',
    description: 'Use your Bitcoin from anywhere in the world',
    badge: 'Global',
  },
];

const stats = [
  { label: 'Transactions', value: '10,000+' },
  { label: 'Users Served', value: '5,000+' },
  { label: 'Volume Processed', value: '₵50M+' },
  { label: 'Success Rate', value: '99.9%' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-r from-orange-500 to-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">₿</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                BitPesa Bridge
              </h1>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              No Signup Required
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
            Spend Bitcoin in Kenya
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Convert your Bitcoin to M-Pesa instantly. Send money, buy airtime, pay bills, 
            and shop anywhere M-Pesa is accepted - all without signing up.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">All M-Pesa Services</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Access all M-Pesa services with Bitcoin. No registration, no KYC, just instant payments.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Link key={service.href} href={service.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className={`w-12 h-12 ${service.bgColor} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <service.icon className={`h-6 w-6 ${service.color}`} />
                    </div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full group-hover:bg-gray-50">
                      Use Service
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Why Choose BitPesa Bridge?</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Built for the Bitcoin community in Kenya with privacy and ease of use in mind.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="bg-gradient-to-r from-orange-100 to-green-100 text-orange-800">
                    {feature.badge}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Trusted by Thousands</h3>
            <p className="text-gray-600">Join the growing community using Bitcoin in Kenya</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gradient-to-r from-orange-50 to-green-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">How It Works</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Three simple steps to spend your Bitcoin anywhere in Kenya
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Choose Service</h4>
              <p className="text-gray-600">Select what you want to do - send money, buy airtime, pay bills, or shop</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Send Bitcoin</h4>
              <p className="text-gray-600">Send the exact Bitcoin amount to the provided address</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Receive M-Pesa</h4>
              <p className="text-gray-600">Get instant M-Pesa credit and use it anywhere</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-orange-500 to-green-500">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Ready to Spend Bitcoin?</h3>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            No signup, no KYC, no hassle. Just instant Bitcoin to M-Pesa conversion.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-orange-600 hover:bg-gray-100">
              Start Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-orange-600">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 bg-gradient-to-r from-orange-500 to-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">₿</span>
                </div>
                <h4 className="text-xl font-bold">BitPesa Bridge</h4>
              </div>
              <p className="text-gray-400">
                Spend Bitcoin anywhere M-Pesa is accepted in Kenya.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Services</h5>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/send" className="hover:text-white">Send Money</Link></li>
                <li><Link href="/airtime" className="hover:text-white">Buy Airtime</Link></li>
                <li><Link href="/paybill" className="hover:text-white">Pay Bills</Link></li>
                <li><Link href="/till" className="hover:text-white">Buy Goods</Link></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Compliance</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BitPesa Bridge. Built with ❤️ for the Bitcoin community in Kenya.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}