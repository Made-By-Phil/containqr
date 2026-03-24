import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketingHeader } from '@/components/MarketingHeader';
import { Footer } from '@/components/Footer';

const FEATURES = [
  'Unlimited containers',
  'QR code labels for every container',
  'Search across all your boxes instantly',
  'Share with your household — no accounts needed',
  'Password-protected containers',
  'Photos, item lists, and notes',
  'Printable QR labels',
];

const Pricing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingHeader />

      <main className="container mx-auto px-4 py-20 max-w-lg flex-1">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
            One price.<br />Everything included.
          </h1>
          <p className="text-muted-foreground text-base">
            No tiers. No add-ons. No surprises.
          </p>
        </div>

        {/* Price block */}
        <div className="bg-card border border-border rounded-2xl p-10 mb-8">
          <div className="text-center mb-8">
            <div className="mb-1">
              <span className="font-display text-7xl font-bold text-foreground">$29</span>
              <span className="text-muted-foreground text-xl ml-2">/ year</span>
            </div>
            <p className="text-muted-foreground/60 text-sm">Cancel anytime.</p>
          </div>

          <Link to="/register" className="block">
            <Button
              className="w-full h-12 text-base font-semibold border-0"
              style={{ background: '#D4820A', color: '#fff' }}
            >
              Get Started
            </Button>
          </Link>
        </div>

        {/* Feature list */}
        <div className="space-y-3">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#D4820A' }} />
              <span className="text-muted-foreground text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
