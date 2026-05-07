import { Package, Sun, Moon, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './ui/sheet';

export function MarketingHeader() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: '#D4820A' }}
          >
            <Package className="h-4 w-4 text-white" />
          </div>
          <span className="truncate font-display text-lg font-bold text-foreground">
            Contain<span style={{ color: '#D4820A' }}>QR</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <Link
            to="/guide"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Guide
          </Link>

          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                to="/account"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Account
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/pricing"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Pricing
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="h-8 w-8 shrink-0">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-xs">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="mt-8 flex flex-col gap-3">
                <Link to="/guide">
                  <Button variant="ghost" className="w-full justify-start">Guide</Button>
                </Link>

                {user ? (
                  <>
                    <Link to="/dashboard">
                      <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
                    </Link>
                    <Link to="/account">
                      <Button variant="ghost" className="w-full justify-start">Account</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/pricing">
                      <Button variant="ghost" className="w-full justify-start">Pricing</Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="ghost" className="w-full justify-start">Sign In</Button>
                    </Link>
                    <Link to="/register">
                      <Button className="w-full justify-start" style={{ background: '#D4820A', color: '#fff' }}>
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
