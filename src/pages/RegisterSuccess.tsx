import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const RegisterSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'processing' | 'error'>('verifying');
  const [error, setError] = useState('');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setError('No session ID found.');
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;
    let cancelled = false;

    const verifySession = async () => {
      if (cancelled) return;

      try {
        const response = await fetch(`/api/stripe/verify-session/?session_id=${sessionId}`);
        const data = await response.json();

        if (cancelled) return;

        if (data.status === 'success') {
          login({
            token: data.token,
            user_id: data.user_id,
            email: data.email,
            username: data.username,
            subscription_status: data.subscription_status,
            has_active_subscription: data.has_active_subscription,
          });
          setStatus('success');
          setTimeout(() => navigate('/dashboard'), 2000);
        } else if (data.status === 'processing' || data.status === 'pending') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(verifySession, 2000);
          } else {
            setStatus('processing');
          }
        } else {
          setStatus('error');
          setError(data.detail || 'Verification failed');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setError('Failed to verify payment.');
        }
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [sessionId, login, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg text-center">
        {status === 'verifying' && (
          <>
            <h1 className="text-2xl font-bold">Verifying Payment...</h1>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-green-600">Welcome to ContainQR!</h1>
            <p className="text-muted-foreground">
              Your account has been created and your subscription is active.
              Redirecting to dashboard...
            </p>
          </>
        )}
        {status === 'processing' && (
          <>
            <h1 className="text-2xl font-bold">Almost There!</h1>
            <p className="text-muted-foreground">
              Your payment was received but your account is still being set up.
              Please try logging in with your credentials in a moment.
            </p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-red-600">Something Went Wrong</h1>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/register')}>Try Again</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterSuccess;
