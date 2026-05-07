import { Package, Sun, Moon, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './ui/sheet';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 group">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary transition-transform group-hover:scale-105">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="truncate font-display text-lg font-bold text-foreground">
            Contain<span className="text-primary">QR</span>
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
              <Button onClick={logout} size="sm" variant="outline">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/#how-it-works"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                How It Works
              </Link>
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
                Login
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
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
                {user ? (
                  <>
                    <Link to="/dashboard">
                      <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
                    </Link>
                    <Link to="/account">
                      <Button variant="ghost" className="w-full justify-start">Account</Button>
                    </Link>
                    <Button onClick={logout} variant="outline" className="w-full justify-start">
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/#how-it-works">
                      <Button variant="ghost" className="w-full justify-start">How It Works</Button>
                    </Link>
                    <Link to="/pricing">
                      <Button variant="ghost" className="w-full justify-start">Pricing</Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="ghost" className="w-full justify-start">Login</Button>
                    </Link>
                    <Link to="/register">
                      <Button className="w-full justify-start">Get Started</Button>
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
