import { useParams, Link, useNavigate } from 'react-router-dom';
import { Package, MapPin, List, FileText, Image, Lock, Search, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { containerColors, Container } from '@/types/container';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PasscodeError {
  requiresPasscode: true;
}

interface SearchResult {
  id: number;
  name: string;
  readable_id: string;
  uuid: string;
  location: string | null;
  other_location: string;
  color: string;
  items: { id: number; name: string; quantity: number }[];
}

// ---------------------------------------------------------------------------
// Passcode helpers
// ---------------------------------------------------------------------------

const SESSION_KEY = (uuid: string) => `passcode_${uuid}`;

function getStoredPasscode(uuid: string): string {
  try {
    return sessionStorage.getItem(SESSION_KEY(uuid)) || '';
  } catch {
    return '';
  }
}

function storePasscode(uuid: string, passcode: string) {
  try {
    sessionStorage.setItem(SESSION_KEY(uuid), passcode);
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchContainer(uuid: string, token: string | null, passcode: string): Promise<Container> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  const params = passcode ? `?passcode=${encodeURIComponent(passcode)}` : '';
  const response = await fetch(`/api/containers/uuid/${uuid}/${params}`, { headers });

  if (response.status === 401) {
    const body = await response.json().catch(() => ({}));
    if (body.requires_passcode) {
      throw { requiresPasscode: true } as PasscodeError;
    }
  }
  if (!response.ok) throw new Error('Container not found');
  return response.json();
}

async function searchHousehold(containerUuid: string, query: string, passcode: string, token: string | null) {
  const params = new URLSearchParams({ container: containerUuid, q: query });
  if (passcode) params.set('passcode', passcode);
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Token ${token}`;
  const response = await fetch(`/api/household-search/?${params}`, { headers });
  if (!response.ok) throw new Error('Search failed');
  const data = await response.json();
  return (data.results || []) as SearchResult[];
}

// ---------------------------------------------------------------------------
// Passcode Overlay Component
// ---------------------------------------------------------------------------

interface PasscodeOverlayProps {
  onSubmit: (passcode: string) => void;
  error: string;
}

function PasscodeOverlay({ onSubmit, error }: PasscodeOverlayProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [shake, setShake] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Shake on error
  useEffect(() => {
    if (error) {
      setShake(true);
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    // Handle paste of full 4-digit code
    if (value.length === 4 && /^\d{4}$/.test(value)) {
      const newDigits = value.split('');
      setDigits(newDigits);
      inputRefs[3].current?.focus();
      onSubmit(value);
      return;
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when last digit entered
    if (digit && index === 3) {
      const code = newDigits.join('');
      if (code.length === 4) onSubmit(code);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground mb-1.5">
          Enter passcode to view this box
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          This box requires a 4-digit passcode.
        </p>

        {/* 4-digit inputs */}
        <div
          className={`flex justify-center gap-3 mb-3 ${shake ? 'animate-shake' : ''}`}
          style={shake ? { animation: 'shake 0.3s ease-in-out' } : {}}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-14 h-14 text-center text-2xl font-mono font-bold rounded-xl border-2 bg-background focus:outline-none focus:border-amber-500 transition-colors ${
                error ? 'border-red-400' : digit ? 'border-amber-400' : 'border-border'
              }`}
              style={{ letterSpacing: 0 }}
              autoComplete="off"
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-2">{error}</p>
        )}
        <p className="text-xs text-muted-foreground">
          4th digit submits automatically
        </p>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discovery Banner + Inline Search
// ---------------------------------------------------------------------------

interface HouseholdSearchSectionProps {
  containerUuid: string;
  passcode: string;
  token: string | null;
}

function HouseholdSearchSection({ containerUuid, passcode, token }: HouseholdSearchSectionProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [expanded]);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const data = await searchHousehold(containerUuid, q, passcode, token);
      setResults(data);
    } catch {
      setSearchError('Couldn\'t search. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [containerUuid, passcode, token]);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const colorOf = (color: string) => containerColors[color] || containerColors.blue;

  return (
    <div className="mt-4">
      {/* Discovery banner */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-colors"
        style={{
          background: '#FFF4E0',
          borderLeft: '3px solid #D4820A',
        }}
      >
        <span className="text-sm font-medium text-amber-800">
          Search all boxes in this household
        </span>
        <ChevronRight
          className={`w-4 h-4 text-amber-600 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Inline search */}
      {expanded && (
        <div className="mt-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search all boxes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {searchError && (
            <p className="text-sm text-red-500 text-center py-2">{searchError}</p>
          )}

          {searching && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!searching && results !== null && results.length === 0 && query && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No results for "{query}"
            </p>
          )}

          {!searching && results && results.length > 0 && (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/c/${r.uuid}/`)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `${colorOf(r.color)}20` }}
                  >
                    <Package className="w-4 h-4" style={{ color: colorOf(r.color) }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.location || r.other_location || 'No location'} ·{' '}
                      {r.items.length} item{r.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                    {r.readable_id}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!searching && !query && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Type to search all boxes
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ContainerView
// ---------------------------------------------------------------------------

const ContainerView = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const { token } = useAuth();

  // Passcode: start with sessionStorage value (from previous valid entry this session)
  const [passcode, setPasscode] = useState(() => (uuid ? getStoredPasscode(uuid) : ''));
  // Track whether user has submitted at least one passcode attempt
  const [attempted, setAttempted] = useState(false);

  const { data: container, isLoading, error } = useQuery<Container, unknown>({
    queryKey: ['container', uuid, token, passcode],
    queryFn: () => fetchContainer(uuid || '', token, passcode),
    enabled: !!uuid,
    retry: false,
  });

  const isPasscodeRequired = error != null && typeof error === 'object' && (error as PasscodeError).requiresPasscode;
  const showOverlay = isPasscodeRequired;
  // Show error only if user already tried a passcode and it was rejected
  const passcodeError = (attempted && isPasscodeRequired) ? 'Incorrect passcode. Try again.' : '';

  // Store successful passcode in sessionStorage
  useEffect(() => {
    if (passcode && !isPasscodeRequired && !isLoading && container) {
      storePasscode(uuid || '', passcode);
    }
  }, [passcode, isPasscodeRequired, isLoading, container, uuid]);

  function handlePasscodeSubmit(code: string) {
    setAttempted(true);
    setPasscode(code);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isPasscodeRequired && (error || !container)) {
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
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const colorValue = container ? (containerColors[container.color] || containerColors.blue) : '#888';

  return (
    <div className="min-h-screen bg-background">
      {/* Passcode overlay */}
      {showOverlay && (
        <PasscodeOverlay
          onSubmit={handlePasscodeSubmit}
          error={passcodeError}
        />
      )}

      {/* Header */}
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
          {container && (
            <span className="text-sm text-muted-foreground font-mono" style={{ letterSpacing: '0.3em' }}>
              {container.readable_id}
            </span>
          )}
        </div>
      </header>

      {container && (
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Container header */}
          <div className="container-card p-6 mb-6">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${colorValue}20` }}
              >
                <Package className="w-7 h-7" style={{ color: colorValue }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {container.name}
                  </h1>
                  {container.is_password_protected && (
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0"
                      style={{ background: 'rgba(212,130,10,0.12)' }}
                      title="Password protected"
                    >
                      <Lock className="w-3.5 h-3.5" style={{ color: '#D4820A' }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {container.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>{container.location}</span>
                    </div>
                  )}
                  <span className="font-mono font-medium text-primary" style={{ letterSpacing: '0.3em' }}>
                    {container.readable_id}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contents */}
          <div className="container-card p-6">
            {container.items && container.items.length > 0 ? (
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
            ) : container.texts && container.texts.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-display text-lg font-semibold">Contents</h2>
                </div>
                <div className="space-y-4">
                  {container.texts.map((textItem) => (
                    <p key={textItem.id} className="text-foreground whitespace-pre-wrap">
                      {textItem.text}
                    </p>
                  ))}
                </div>
              </>
            ) : container.photos && container.photos.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Image className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-display text-lg font-semibold">Contents</h2>
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

          {/* Household search (discovery banner + inline search) */}
          <HouseholdSearchSection
            containerUuid={uuid || ''}
            passcode={passcode}
            token={token}
          />

          <p className="text-center text-sm text-muted-foreground mt-8">
            Last updated {new Date(container.updated_at).toLocaleDateString()}
          </p>
        </main>
      )}
    </div>
  );
};

export default ContainerView;
