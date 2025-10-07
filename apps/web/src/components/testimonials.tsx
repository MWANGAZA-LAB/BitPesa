import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const testimonials = [
  {
    name: 'Sarah Mwangi',
    role: 'Small Business Owner',
    location: 'Nairobi',
    content: 'BitPesa Bridge has revolutionized how I accept payments. My customers can now pay with Bitcoin, and I receive M-Pesa instantly. It\'s been a game-changer for my business.',
    rating: 5,
    avatar: '/avatars/sarah.jpg',
  },
  {
    name: 'John Kimani',
    role: 'Freelancer',
    location: 'Mombasa',
    content: 'As a freelancer working with international clients, BitPesa Bridge makes it so easy to convert my Bitcoin earnings to M-Pesa. No more complicated banking processes.',
    rating: 5,
    avatar: '/avatars/john.jpg',
  },
  {
    name: 'Grace Wanjiku',
    role: 'Student',
    location: 'Kisumu',
    content: 'I love how fast and secure the payments are. I can top up my phone, pay for groceries, and send money to family all with Bitcoin. It\'s amazing!',
    rating: 5,
    avatar: '/avatars/grace.jpg',
  },
  {
    name: 'David Ochieng',
    role: 'Tech Entrepreneur',
    location: 'Eldoret',
    content: 'The Lightning Network integration is incredible. Payments are instant and fees are minimal. This is the future of payments in Kenya.',
    rating: 5,
    avatar: '/avatars/david.jpg',
  },
  {
    name: 'Mary Akinyi',
    role: 'Retailer',
    location: 'Nakuru',
    content: 'My customers love being able to pay with Bitcoin. It\'s brought in new customers who prefer crypto payments. The setup was super easy too.',
    rating: 5,
    avatar: '/avatars/mary.jpg',
  },
  {
    name: 'Peter Mwangi',
    role: 'Content Creator',
    location: 'Thika',
    content: 'BitPesa Bridge has made it so much easier to monetize my content. International supporters can send Bitcoin, and I get M-Pesa instantly.',
    rating: 5,
    avatar: '/avatars/peter.jpg',
  },
];

const stats = [
  { label: 'Customer Satisfaction', value: '98%' },
  { label: 'Average Rating', value: '4.9/5' },
  { label: 'Happy Customers', value: '5,000+' },
  { label: 'Transactions Processed', value: '50,000+' },
];

export function Testimonials() {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            Loved by{' '}
            <span className="text-gradient">thousands</span>{' '}
            of users
          </h2>
          <p className="text-lg text-muted-foreground">
            See what our users are saying about BitPesa Bridge
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 mb-16">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <Quote className="h-6 w-6 text-muted-foreground mb-4" />
                
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback>
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="font-medium text-sm">
                      {testimonial.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.role} • {testimonial.location}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
