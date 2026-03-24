import { useParams, useNavigate } from 'react-router-dom';
import { Package, Search, X, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect, useCallback } from 'react';
import { containerColors } from '@/types/container';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ViewerMeta {
  requires_passcode: boolean;
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

const SESSION_KEY = (token: string) => `viewer_passcode_${token}`;

function getStoredPasscode(token: string): string {
  try {
    return sessionStorage.getItem(SESSION_KEY(token)) || '';
  } catch {
    return '';
  }
}

function storePasscode(token: string, passcode: string) {
  try {
    sessionStorage.setItem(SESSION_KEY(token), passcode);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Passcode Overlay
// ---------------------------------------------------------------------------

interface PasscodeOverlayProps {
  onSubmit: (passcode: string) => Promise<boolean>;
}

function PasscodeOverlay({ onSubmit }: PasscodeOverlayProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  useEffect(() => {
    if (error) {
      setShake(true);
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function handleSubmit(code: string) {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const ok = await onSubmit(code);
    if (!ok) {
      setError('Incorrect passcode. Try again.');
      setSubmitting(false);
    }
  }

  function handleChange(index: number, value: string) {
    if (value.length === 4 && /^\d{4}$/.test(value)) {
      const newDigits = value.split('');
      setDigits(newDigits);
      inputRefs[3].current?.focus();
      handleSubmit(value);
      return;
    }
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
    if (digit && index === 3) {
      const code = newDigits.join('');
      if (code.length === 4) handleSubmit(code);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-sm border border-border p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground mb-1.5">
          Enter passcode
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          This household requires a passcode.
        </p>

        <div
          className="flex justify-center gap-3 mb-3"
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
              disabled={submitting}
              className={`w-14 h-14 text-center text-2xl font-mono font-bold rounded-xl border-2 bg-background focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50 ${
                error ? 'border-red-400' : digit ? 'border-amber-400' : 'border-border'
              }`}
              autoComplete="off"
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
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
// Main ViewerDashboard
// ---------------------------------------------------------------------------

const ViewerDashboard = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();

  const [passcode, setPasscode] = useState(() => (shareToken ? getStoredPasscode(shareToken) : ''));
  const [unlocked, setUnlocked] = useState(() => !!passcode);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch meta (owner name + whether passcode is required)
  const { data: meta, isLoading: metaLoading, error: metaError } = useQuery<ViewerMeta>({
    queryKey: ['viewer-meta', shareToken],
    queryFn: async () => {
      const res = await fetch(`/api/view/${shareToken}/meta/`);
      if (!res.ok) throw new Error('Invalid link');
      return res.json();
    },
    enabled: !!shareToken,
    retry: false,
  });

  // Auto-unlock if meta says no passcode required
  useEffect(() => {
    if (meta && !meta.requires_passcode) {
      setUnlocked(true);
    }
  }, [meta]);

  // Focus search input after unlocking
  useEffect(() => {
    if (unlocked) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [unlocked]);

  // Validate passcode via API
  async function validatePasscode(code: string): Promise<boolean> {
    const res = await fetch(`/api/view/${shareToken}/validate-passcode/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: code }),
    });
    if (res.ok) {
      storePasscode(shareToken || '', code);
      setPasscode(code);
      setUnlocked(true);
      return true;
    }
    return false;
  }

  // Search
  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const params = new URLSearchParams({ q });
      if (passcode) params.set('passcode', passcode);
      const res = await fetch(`/api/view/${shareToken}/containers/?${params}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.containers || []);
    } catch {
      setSearchError('Couldn\'t search. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [shareToken, passcode]);

  useEffect(() => {
    if (!unlocked) return;
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch, unlocked]);

  const colorOf = (color: string) => containerColors[color as keyof typeof containerColors] || containerColors.blue;

  // Loading
  if (metaLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // Invalid / disabled link
  if (metaError || !meta) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground mb-2">
            This link is no longer active
          </h1>
          <p className="text-muted-foreground mb-6">
            The household share link may have been disabled or rotated.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Passcode gate
  if (meta.requires_passcode && !unlocked) {
    return <PasscodeOverlay onSubmit={validatePasscode} />;
  }

  // Main search dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Contain<span className="text-primary">QR</span>
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-4 text-center">
          This household — read only
        </p>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search all boxes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Results */}
        {!query && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Type to search all boxes in this household
          </p>
        )}

        {searchError && (
          <div className="text-center py-4">
            <p className="text-sm text-red-500 mb-2">{searchError}</p>
            <button
              onClick={() => handleSearch(query)}
              className="text-sm text-primary underline"
            >
              Retry
            </button>
          </div>
        )}

        {searching && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" style={{ width: `${70 + i * 6}%` }} />
            ))}
          </div>
        )}

        {!searching && results !== null && results.length === 0 && query && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No results for "{query}"
          </p>
        )}

        {!searching && results && results.length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/c/${r.uuid}/`)}
                className="w-full px-4 py-4 flex items-center gap-3 hover:bg-muted/50 active:bg-muted transition-colors text-left min-h-[56px]"
              >
                <div
                  className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
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
                <span
                  className="text-xs text-muted-foreground flex-shrink-0 font-mono"
                  style={{ letterSpacing: '0.15em' }}
                >
                  {r.readable_id}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewerDashboard;
