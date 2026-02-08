import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import RegisterSuccess from '../RegisterSuccess';

const renderWithProviders = (sessionId?: string) => {
  const url = sessionId
    ? `/register/success?session_id=${sessionId}`
    : '/register/success';
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <Routes>
          <Route path="/register/success" element={<RegisterSuccess />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/register" element={<div>Register</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('RegisterSuccess', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows error when no session_id in URL', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/no session id found/i)).toBeInTheDocument();
    });
  });

  it('shows verifying state initially', () => {
    // Return a pending promise so fetch never resolves during this test
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));
    renderWithProviders('cs_test_123');
    expect(screen.getByText(/verifying payment/i)).toBeInTheDocument();
  });

  it('shows welcome on successful verification', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        token: 'test-token',
        user_id: 1,
        email: 'test@test.com',
        username: 'testuser',
        subscription_status: 'active',
        has_active_subscription: true,
      }),
    } as Response);

    renderWithProviders('cs_test_123');

    await waitFor(() => {
      expect(screen.getByText(/welcome to containqr/i)).toBeInTheDocument();
    });
  });

  it('shows processing state after max retries', async () => {
    // Mock fetch to always return 'processing' status
    vi.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      json: async () => ({ status: 'processing', detail: 'Still setting up.' }),
    }) as unknown as Promise<Response>);

    renderWithProviders('cs_test_123');

    // Wait for all 10 retries to exhaust (2s intervals = ~20s)
    await waitFor(
      () => {
        expect(screen.getByText(/almost there/i)).toBeInTheDocument();
      },
      { timeout: 25000 },
    );
  }, 30000);

  it('shows error on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders('cs_test_123');

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
