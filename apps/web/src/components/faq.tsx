import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const faqs = [
  {
    question: 'What is BitPesa Bridge?',
    answer: 'BitPesa Bridge is a platform that allows you to convert Bitcoin to M-Pesa instantly using the Lightning Network. You can spend your Bitcoin anywhere M-Pesa is accepted in Kenya.',
  },
  {
    question: 'How does it work?',
    answer: 'Simply scan a QR code or enter an amount, pay with Bitcoin via Lightning Network, and receive M-Pesa instantly in your phone. You can then use M-Pesa to pay for goods and services anywhere in Kenya.',
  },
  {
    question: 'Is it safe to use?',
    answer: 'Yes, BitPesa Bridge uses bank-level security and encryption. Your private keys are never stored on our servers, and all transactions are secured by the Lightning Network.',
  },
  {
    question: 'What are the fees?',
    answer: 'We charge a small fee for the conversion service (2.5% exchange rate spread), plus standard Lightning Network fees (0.1%) and M-Pesa fees (1%). All fees are displayed before you confirm your transaction.',
  },
  {
    question: 'How fast are the transactions?',
    answer: 'Lightning Network payments are typically processed in under 3 seconds. The entire process from Bitcoin payment to M-Pesa receipt usually takes less than 30 seconds.',
  },
  {
    question: 'Do I need a bank account?',
    answer: 'No, you only need a Bitcoin wallet and a phone number for M-Pesa. No bank account or traditional banking setup is required.',
  },
  {
    question: 'Can I use it for business?',
    answer: 'Yes, BitPesa Bridge offers business plans with higher limits, API access, and advanced features for merchants and businesses.',
  },
  {
    question: 'What Bitcoin wallets are supported?',
    answer: 'Any Lightning Network compatible wallet works with BitPesa Bridge, including popular wallets like Phoenix, Breez, and Muun.',
  },
  {
    question: 'Is there a mobile app?',
    answer: 'Yes, BitPesa Bridge is available as a mobile app for both iOS and Android, optimized for the best mobile experience.',
  },
  {
    question: 'What if I have a problem?',
    answer: 'Our support team is available 24/7 to help with any issues. You can contact us through the app, email, or phone support.',
  },
];

export function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(item => item !== index)
        : [...prev, index]
    );
  };

  return (
    <section id="faq" className="py-20 lg:py-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            FAQ
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            Frequently asked{' '}
            <span className="text-gradient">questions</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about BitPesa Bridge
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-0">
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                  onClick={() => toggleItem(index)}
                >
                  <span className="font-medium text-foreground">
                    {faq.question}
                  </span>
                  {openItems.includes(index) ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                
                {openItems.includes(index) && (
                  <div className="px-6 pb-4">
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Still have questions?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@bitpesa.com"
              className="text-primary hover:underline"
            >
              Contact Support
            </a>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <a
              href="/help"
              className="text-primary hover:underline"
            >
              Help Center
            </a>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <a
              href="/docs"
              className="text-primary hover:underline"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
