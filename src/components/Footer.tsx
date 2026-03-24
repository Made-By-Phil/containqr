import { Package } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#D4820A' }}
            >
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Contain<span style={{ color: '#D4820A' }}>QR</span>
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ContainQR. Organize smarter.
          </p>

          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Contact'].map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
