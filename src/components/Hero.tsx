import { QrCode, Package, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero-gradient relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 subtle-pattern opacity-50" />
      
      <div className="container mx-auto px-4 py-24 lg:py-32 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <QrCode className="w-4 h-4" />
            Smart Storage Organization
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Know What's in Every{' '}
            <span className="gradient-text">Storage Bin</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create QR codes for your storage containers. Scan to see contents instantly.
            Search to find any item in seconds. Never dig through bins again.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2" onClick={() => navigate('/dashboard')}>
              Try Demo Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        {/* Feature Cards Preview */}
        <div className="mt-20 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              icon: QrCode,
              title: 'Scan & View',
              description: 'Each container gets a unique QR code that links to its contents page',
            },
            {
              icon: Search,
              title: 'Search Anywhere',
              description: 'Find any item across all your containers with instant search',
            },
            {
              icon: Package,
              title: 'Organize Smart',
              description: 'Track locations, add notes, and keep your storage organized',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="container-card p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
