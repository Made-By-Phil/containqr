import { QrCode, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PROOF_POINTS = [
  {
    icon: QrCode,
    title: 'Scan & see instantly',
    description: "Every container gets a QR label. Point your phone camera, see what's inside.",
  },
  {
    icon: Search,
    title: 'Search everything',
    description: 'Find any item across all your containers in seconds — no digging required.',
  },
  {
    icon: Users,
    title: 'Share with your household',
    description: 'Send one link. Anyone can search your boxes without creating an account.',
  },
];

export function Hero() {
  return (
    <section className="bg-background">
      <div className="container mx-auto px-4 py-24 lg:py-32">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 leading-tight">
            Know what's in<br />every storage bin.
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Create QR codes for your storage containers. Scan to see contents.
            Search to find anything in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 font-semibold border-0"
                style={{ background: '#D4820A', color: '#fff' }}
              >
                Get Started — $29/yr
              </Button>
            </Link>
            <Link to="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-8"
              >
                See pricing
              </Button>
            </Link>
          </div>
        </div>

        {/* Proof points */}
        <div className="mt-20 max-w-3xl mx-auto grid md:grid-cols-3 gap-10">
          {PROOF_POINTS.map((point) => (
            <div key={point.title} className="flex flex-col items-center text-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(212,130,10,0.12)' }}
              >
                <point.icon className="w-5 h-5" style={{ color: '#D4820A' }} />
              </div>
              <div>
                <p className="font-display font-semibold text-foreground text-sm mb-1">{point.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
