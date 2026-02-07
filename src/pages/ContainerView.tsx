import { useParams, Link } from 'react-router-dom';
import { Package, MapPin, ArrowLeft, List, FileText, Image, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { containerColors, Container } from '@/types/container';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

class PasswordProtectedError extends Error {
  constructor() {
    super('Password protected');
    this.name = 'PasswordProtectedError';
  }
}

const fetchContainer = async (uuid: string, token: string | null): Promise<Container> => {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const response = await fetch(`/api/containers/uuid/${uuid}/`, { headers });
  if (response.status === 401) {
    throw new PasswordProtectedError();
  }
  if (!response.ok) {
    throw new Error('Container not found');
  }
  return response.json();
};

const ContainerView = () => {
  const { username, containerId } = useParams();
  const { token } = useAuth();

  const { data: container, isLoading, error } = useQuery({
    queryKey: ['container', containerId, token],
    queryFn: () => fetchContainer(containerId || '', token),
    enabled: !!containerId,
  });

  const isPasswordProtected = error instanceof PasswordProtectedError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isPasswordProtected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Password Protected
          </h1>
          <p className="text-muted-foreground mb-6">
            This container is private. Only the owner can view its contents.
          </p>
          <Link to="/login">
            <Button>
              Log In to View
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !container) {
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

  const colorValue = containerColors[container.color] || containerColors.blue;

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
            {username}/{container.readable_id}
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
                  {container.readable_id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contents */}
        <div className="container-card p-6">
          {container.items.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <List className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-display text-lg font-semibold">
                  Contents ({container.items.length} items)
                </h2>
              </div>
              <div className="divide-y divide-border">
                {container.items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.quantity > 1 && (
                      <Badge variant="secondary">×{item.quantity}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : container.texts.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-display text-lg font-semibold">
                  Contents
                </h2>
              </div>
              <div className="space-y-4">
                {container.texts.map((textItem) => (
                  <p key={textItem.id} className="text-foreground whitespace-pre-wrap">
                    {textItem.text}
                  </p>
                ))}
              </div>
            </>
          ) : container.photos.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-display text-lg font-semibold">
                  Contents
                </h2>
              </div>
              <div className="grid gap-4">
                {container.photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.image}
                    alt="Container contents"
                    className="w-full rounded-lg"
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No contents added yet</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Last updated {new Date(container.updated_at).toLocaleDateString()}
        </p>
      </main>
    </div>
  );
};

export default ContainerView;
