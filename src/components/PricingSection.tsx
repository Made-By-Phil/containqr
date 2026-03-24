import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  'Unlimited containers',
  'QR code labels',
  'Household sharing — no accounts needed',
  'Password protection',
  'Photos, lists, and notes',
];

export const PricingSection = () => {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-md mx-auto text-center">
        <p className="text-sm font-medium text-primary mb-3 tracking-wide uppercase">Pricing</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
          One price. Everything included.
        </h2>
        <p className="text-muted-foreground mb-10">No tiers, no add-ons, no surprises.</p>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          <div className="mb-1">
            <span className="font-display text-5xl font-bold text-foreground">$29</span>
            <span className="text-muted-foreground text-lg ml-2">/ year</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Cancel anytime.</p>

          <div className="space-y-2.5 text-left mb-7">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{f}</span>
              </div>
            ))}
          </div>

          <Link to="/register" className="block">
            <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-semibold">
              Get Started
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          <Link to="/pricing" className="hover:text-foreground underline">Full pricing details →</Link>
        </p>
      </div>
    </section>
  );
};
