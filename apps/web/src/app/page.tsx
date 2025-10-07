import { Suspense } from 'react';
import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { HowItWorks } from '@/components/how-it-works';
import { Pricing } from '@/components/pricing';
import { Testimonials } from '@/components/testimonials';
import { FAQ } from '@/components/faq';
import { CTA } from '@/components/cta';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Suspense fallback={<LoadingSpinner />}>
          <Hero />
        </Suspense>
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
