import { useState, useRef, useEffect } from 'react';
import { Copy, RotateCcw, Trash2, Lock, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(token: string) {
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}

// ---------------------------------------------------------------------------
// Passcode modal
// ---------------------------------------------------------------------------

interface PasscodeModalProps {
  onSubmit: (code: string) => void;
  onCancel: () => void;
  error: string;
  title: string;
}

function PasscodeModal({ onSubmit, onCancel, error, title }: PasscodeModalProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [shake, setShake] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => { inputRefs[0].current?.focus(); }, []);

  useEffect(() => {
    if (error) {
      setShake(true);
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [error]);

  function handleChange(index: number, value: string) {
    if (value.length === 4 && /^\d{4}$/.test(value)) {
      setDigits(value.split(''));
      onSubmit(value);
      return;
    }
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 3) inputRefs[index + 1].current?.focus();
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
      <div className="bg-card rounded-2xl shadow-xl p-8 w-full max-w-sm text-center border border-border">
        <h2 className="font-display text-lg font-bold text-foreground mb-1.5">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">Enter a 4-digit numeric passcode.</p>

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
              className={`w-14 h-14 text-center text-2xl font-mono font-bold rounded-xl border-2 bg-background focus:outline-none focus:border-amber-500 transition-colors ${
                error ? 'border-red-400' : digit ? 'border-amber-400' : 'border-border'
              }`}
              autoComplete="off"
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        <button
          onClick={onCancel}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
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
// Account page
// ---------------------------------------------------------------------------

const Account = () => {
  const { token, user, logout } = useAuth();
  const qc = useQueryClient();

  // Share link
  const { data: shareLinkData } = useQuery<{ share_token: string | null; enabled: boolean }>({
    queryKey: ['share-link', token],
    queryFn: async () => {
      const res = await fetch('/api/account/share-link/', { headers: authHeaders(token || '') });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!token,
  });

  // Passcode status
  const { data: passcodeData } = useQuery<{ has_passcode: boolean }>({
    queryKey: ['passcode-status', token],
    queryFn: async () => {
      const res = await fetch('/api/account/passcode/', { headers: authHeaders(token || '') });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!token,
  });

  // Subscription status
  const { data: subData } = useQuery<{ status: string; current_period_end: string | null }>({
    queryKey: ['subscription-status', token],
    queryFn: async () => {
      const res = await fetch('/api/stripe/subscription-status/', { headers: authHeaders(token || '') });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!token,
  });

  // UI state
  const [copied, setCopied] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeModalTitle, setPasscodeModalTitle] = useState('Set passcode');
  const [passcodeError, setPasscodeError] = useState('');

  const shareUrl = shareLinkData?.share_token
    ? `${window.location.origin}/view/${shareLinkData.share_token}`
    : null;

  function copyLink() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const rotateLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/account/share-link/', {
        method: 'POST',
        headers: authHeaders(token || ''),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['share-link'] });
      setShowRotateConfirm(false);
    },
  });

  const disableLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/account/share-link/', {
        method: 'DELETE',
        headers: authHeaders(token || ''),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['share-link'] }),
  });

  const enableLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/account/share-link/', {
        method: 'POST',
        headers: authHeaders(token || ''),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['share-link'] }),
  });

  const setPasscodeMutation = useMutation({
    mutationFn: async (passcode: string) => {
      const res = await fetch('/api/account/passcode/', {
        method: 'POST',
        headers: authHeaders(token || ''),
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passcode-status'] });
      setShowPasscodeModal(false);
      setPasscodeError('');
    },
    onError: (err: Error) => {
      setPasscodeError(err.message);
    },
  });

  const removePasscodeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/account/passcode/', {
        method: 'DELETE',
        headers: authHeaders(token || ''),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passcode-status'] }),
  });

  function handleSetPasscode() {
    setPasscodeModalTitle('Set passcode');
    setPasscodeError('');
    setShowPasscodeModal(true);
  }

  function handleChangePasscode() {
    setPasscodeModalTitle('Change passcode');
    setPasscodeError('');
    setShowPasscodeModal(true);
  }

  const statusColors: Record<string, string> = {
    active: 'bg-[#3D7A4A]/10 text-[#3D7A4A]',
    past_due: 'bg-[#E8A547]/15 text-[#B36C00]',
    canceled: 'bg-[#C94444]/10 text-[#C94444]',
    incomplete: 'bg-muted text-muted-foreground',
  };
  const subStatus = subData?.status || 'unknown';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground mb-8">Account</h1>

        {/* ── Subscription ─────────────────────────────────────────────────── */}
        <section className="settings-panel p-6 mb-4">
          <h2 className="font-display text-base font-semibold text-foreground mb-4">Subscription</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground capitalize">{subStatus}</span>
                {subData?.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[subData.status] || 'bg-gray-100 text-gray-600'}`}>
                    {subData.status}
                  </span>
                )}
              </div>
              {subData?.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(subData.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Stripe billing portal — opens in new tab
                window.open('/api/stripe/subscription-status/', '_blank');
              }}
            >
              Manage Billing
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            $29 / year · Cancel anytime
          </p>
        </section>

        {/* ── Household Sharing ────────────────────────────────────────────── */}
        <section className="settings-panel p-6 mb-4">
          <h2 className="font-display text-base font-semibold text-foreground mb-4">Household Sharing</h2>

          {/* Share Link */}
          <div className="mb-6">
            <p className="text-sm font-medium text-foreground mb-1">Share Link</p>
            <p className="text-xs text-muted-foreground mb-3">
              Share this link with family to let them search your boxes — no account needed.
            </p>

            {shareLinkData?.enabled && shareUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-muted text-xs font-mono text-muted-foreground truncate">
                    {shareUrl}
                  </div>
                  <button
                    onClick={copyLink}
                    className="flex-shrink-0 w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="flex gap-2">
                  {!showRotateConfirm ? (
                    <button
                      onClick={() => setShowRotateConfirm(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Rotate link
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-amber-800">Old link will stop working immediately.</span>
                      <button
                        onClick={() => rotateLinkMutation.mutate()}
                        className="font-medium text-amber-700 hover:text-amber-900"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => setShowRotateConfirm(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <span className="text-border">·</span>
                  <button
                    onClick={() => disableLinkMutation.mutate()}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Disable
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Link disabled</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => enableLinkMutation.mutate()}
                  disabled={enableLinkMutation.isPending}
                >
                  Enable
                </Button>
              </div>
            )}
          </div>

          {/* Passcode */}
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Passcode</p>
            <p className="text-xs text-muted-foreground mb-3">
              Require a passcode to view password-protected boxes.
            </p>

            {passcodeData?.has_passcode ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg tracking-[0.3em] text-foreground">●●●●</span>
                <button
                  onClick={handleChangePasscode}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Change
                </button>
                <button
                  onClick={() => removePasscodeMutation.mutate()}
                  className="text-xs text-muted-foreground hover:text-destructive underline"
                  disabled={removePasscodeMutation.isPending}
                >
                  Remove
                </button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={handleSetPasscode}>
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Set Passcode
              </Button>
            )}
          </div>
        </section>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <section className="settings-panel p-6">
          <h2 className="font-display text-base font-semibold text-foreground mb-4">Account</h2>
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-0.5">Email</p>
            <p className="text-sm text-foreground">{user?.email || user?.username || '—'}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="text-muted-foreground"
          >
            Sign Out
          </Button>
        </section>
      </main>

      <Footer />

      {/* Passcode modal */}
      {showPasscodeModal && (
        <PasscodeModal
          title={passcodeModalTitle}
          error={passcodeError}
          onSubmit={(code) => setPasscodeMutation.mutate(code)}
          onCancel={() => { setShowPasscodeModal(false); setPasscodeError(''); }}
        />
      )}
    </div>
  );
};

export default Account;
