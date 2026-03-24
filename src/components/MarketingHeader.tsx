import { Package, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export function MarketingHeader() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#D4820A' }}
          >
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            Contain<span style={{ color: '#D4820A' }}>QR</span>
          </span>
        </Link>

        <nav className="flex items-center gap-5">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <Link
            to="/guide"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Guide
          </Link>

          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/account"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Account
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link to="/register">
                <Button
                  size="sm"
                  className="border-0 font-semibold"
                  style={{ background: '#D4820A', color: '#fff' }}
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
