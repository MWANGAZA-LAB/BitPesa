'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight, 
  Zap, 
  Smartphone, 
  CreditCard, 
  Shield, 
  Clock,
  TrendingUp,
  Users,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Hero() {
  const [currentStat, setCurrentStat] = useState(0);
  
  const stats = [
    { label: 'Transactions', value: '10,000+', icon: TrendingUp },
    { label: 'Users', value: '5,000+', icon: Users },
    { label: 'Countries', value: '1', icon: Globe },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [stats.length]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 h-20 w-20 rounded-full bg-bitcoin/10 blur-xl animate-pulse-slow" />
      <div className="absolute top-40 right-20 h-32 w-32 rounded-full bg-mpesa/10 blur-xl animate-pulse-slow delay-1000" />
      <div className="absolute bottom-20 left-1/4 h-16 w-16 rounded-full bg-primary/10 blur-xl animate-pulse-slow delay-2000" />

      <div className="container relative py-20 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
            <Zap className="mr-2 h-4 w-4" />
            Lightning Fast Bitcoin Payments
          </Badge>

          {/* Main Heading */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Spend Bitcoin{' '}
            <span className="text-gradient">Anywhere</span>{' '}
            in Kenya
          </h1>

          {/* Subheading */}
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl lg:text-2xl max-w-3xl mx-auto">
            Seamlessly convert your Bitcoin to M-Pesa and pay for everything from airtime to groceries. 
            No bank account needed, just your phone and Bitcoin.
          </p>

          {/* CTA Buttons */}
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link href="/app">
                <Smartphone className="mr-2 h-5 w-5" />
                Start Paying Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link href="#how-it-works">
                <Clock className="mr-2 h-5 w-5" />
                How It Works
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card 
                  key={stat.label}
                  className={cn(
                    "transition-all duration-500 hover:shadow-lg",
                    currentStat === index && "ring-2 ring-primary shadow-glow"
                  )}
                >
                  <CardContent className="p-6 text-center">
                    <Icon className="mx-auto mb-2 h-8 w-8 text-primary" />
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bitcoin/10">
                <Zap className="h-6 w-6 text-bitcoin" />
              </div>
              <h3 className="text-sm font-medium">Lightning Fast</h3>
              <p className="text-xs text-muted-foreground text-center">
                Instant payments with Lightning Network
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mpesa/10">
                <CreditCard className="h-6 w-6 text-mpesa" />
              </div>
              <h3 className="text-sm font-medium">M-Pesa Integration</h3>
              <p className="text-xs text-muted-foreground text-center">
                Pay anywhere M-Pesa is accepted
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-sm font-medium">Secure</h3>
              <p className="text-xs text-muted-foreground text-center">
                Bank-level security and encryption
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <Smartphone className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-sm font-medium">Mobile First</h3>
              <p className="text-xs text-muted-foreground text-center">
                Optimized for mobile devices
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
