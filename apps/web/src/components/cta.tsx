import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Smartphone, 
  ArrowRight, 
  Download, 
  QrCode,
  Shield,
  Zap
} from 'lucide-react';

export function CTA() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-primary/5 via-background to-mpesa/5">
      <div className="container">
        <div className="mx-auto max-w-4xl">
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            
            {/* Floating Elements */}
            <div className="absolute top-10 right-10 h-20 w-20 rounded-full bg-bitcoin/10 blur-xl animate-pulse-slow" />
            <div className="absolute bottom-10 left-10 h-16 w-16 rounded-full bg-mpesa/10 blur-xl animate-pulse-slow delay-1000" />
            
            <CardContent className="relative p-12 lg:p-16">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-bitcoin to-mpesa">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-6">
                  Ready to start{' '}
                  <span className="text-gradient">spending Bitcoin</span>?
                </h2>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of users who are already using Bitcoin to pay for everything in Kenya. 
                  Download the app and start your first transaction in minutes.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Button asChild size="lg" className="text-lg px-8 py-6">
                    <Link href="/app">
                      <Smartphone className="mr-2 h-5 w-5" />
                      Get Started Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                    <Link href="#how-it-works">
                      <QrCode className="mr-2 h-5 w-5" />
                      See How It Works
                    </Link>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                      <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium">Secure & Safe</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                      <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium">Lightning Fast</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                      <Download className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium">Easy Setup</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
