import { CheckCircle2, Circle, X, Package, Tag, QrCode, Scan, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface OnboardingStatus {
  add_container: boolean;
  add_items: boolean;
  view_qr: boolean;
  scan_qr: boolean;
  share_household: boolean;
  all_complete: boolean;
  dismissed: boolean;
}

const STEPS = [
  {
    key: 'add_container' as const,
    label: 'Add your first container',
    hint: "Create a container to track what's inside",
    icon: Package,
  },
  {
    key: 'add_items' as const,
    label: 'Add items to a container',
    hint: "List what's stored so you can find it later",
    icon: Tag,
  },
  {
    key: 'view_qr' as const,
    label: 'View a QR code',
    hint: 'Open the QR code to print or download',
    icon: QrCode,
  },
  {
    key: 'scan_qr' as const,
    label: 'Scan a QR code',
    hint: 'Test it — scan your own label with your phone',
    icon: Scan,
  },
  {
    key: 'share_household' as const,
    label: 'Share with your household',
    hint: 'Let family search your boxes without an account',
    icon: Share2,
  },
];

interface OnboardingChecklistProps {
  onDismiss?: () => void;
}

const OnboardingChecklist = ({ onDismiss }: OnboardingChecklistProps) => {
  const { token } = useAuth();

  const { data: status, isLoading } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-status', token],
    queryFn: async () => {
      const res = await fetch('/api/onboarding-status/', {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!token,
    staleTime: 30_000,
  });

  if (isLoading || !status || status.all_complete || status.dismissed) return null;

  const completedCount = STEPS.filter((s) => status[s.key]).length;

  async function handleDismiss() {
    onDismiss?.();
    await fetch('/api/onboarding-dismiss/', {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    });
  }

  return (
    <div className="rounded-xl mb-6 overflow-hidden bg-amber-50 border border-amber-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <h2 className="font-display text-base font-bold text-amber-900">
            Get started
          </h2>
          <p className="text-xs text-amber-700 mt-0.5">
            {completedCount} of {STEPS.length} steps complete
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-100 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-amber-700" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mx-5 mb-3 h-1.5 rounded-full bg-amber-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="divide-y divide-amber-100">
        {STEPS.map(({ key, label, hint, icon: Icon }) => {
          const done = status[key];
          return (
            <div
              key={key}
              className={`flex items-center gap-3 px-5 py-3 ${done ? 'opacity-60' : ''}`}
            >
              {done ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-amber-600" />
              ) : (
                <Circle className="w-5 h-5 flex-shrink-0 text-amber-300" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'line-through text-amber-700' : 'text-amber-900'}`}>
                  {label}
                </p>
                {!done && (
                  <p className="text-xs text-amber-600 mt-0.5">{hint}</p>
                )}
              </div>
              {!done && <Icon className="w-4 h-4 flex-shrink-0 text-amber-400" />}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3">
        <button
          onClick={handleDismiss}
          className="text-xs text-amber-600 hover:text-amber-800 underline"
        >
          Hide this checklist
        </button>
      </div>
    </div>
  );
};

export default OnboardingChecklist;
