import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Lock, MapPin, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { mockContainers } from '@/data/mockContainers';
import { containerColors, ContainerColor } from '@/types/container';

const ContainerView = () => {
  const { username, containerId } = useParams();
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Find container by ID
  const container = mockContainers.find(c => c.id === containerId);

  if (!container) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Container Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            This container doesn't exist or may have been removed.
          </p>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const colorValue = containerColors[container.color as ContainerColor] || containerColors.teal;
  const needsPassword = container.isPasswordProtected && !isUnlocked;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo, accept any password
    if (password.length >= 1) {
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Please enter the password');
    }
  };

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="container-card p-8 max-w-md w-full text-center">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${colorValue}20` }}
          >
            <Lock className="w-8 h-8" style={{ color: colorValue }} />
          </div>
          
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Protected Container
          </h1>
          <p className="text-muted-foreground mb-6">
            This container is password protected. Enter the password to view its contents.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Unlock Container
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header for public view */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Contain<span className="text-primary">QR</span>
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {username}/{container.shortId}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Container Header */}
        <div className="container-card p-6 mb-6">
          <div className="flex items-start gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colorValue}20` }}
            >
              <Package 
                className="w-7 h-7"
                style={{ color: colorValue }}
              />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                {container.name}
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{container.location}</span>
                </div>
                <span className="font-mono font-medium text-primary">
                  {container.shortId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="container-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">
            Contents ({container.items.length} items)
          </h2>
          <div className="divide-y divide-border">
            {container.items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground">{item.notes}</p>
                  )}
                </div>
                {item.quantity && item.quantity > 1 && (
                  <Badge variant="secondary">×{item.quantity}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Last updated {container.updatedAt.toLocaleDateString()}
        </p>
      </main>
    </div>
  );
};

export default ContainerView;
