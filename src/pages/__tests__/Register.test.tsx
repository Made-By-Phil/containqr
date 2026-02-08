import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterPage from '../Register';

const renderPage = () =>
  render(
    <BrowserRouter>
      <RegisterPage />
    </BrowserRouter>
  );

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders form fields and submit button', () => {
    renderPage();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument();
  });

  it('shows heading and pricing text', () => {
    renderPage();
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.getByText(/yearly subscription/i)).toBeInTheDocument();
  });

  it('has a link to login page', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /login/i });
    expect(link).toHaveAttribute('href', '/login');
  });

  it('redirects to checkout_url on successful submit', async () => {
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        checkout_url: 'https://checkout.stripe.com/test',
        session_id: 'cs_123',
      }),
    } as Response);

    renderPage();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => {
      expect(mockLocation.href).toBe('https://checkout.stripe.com/test');
    });
  });

  it('displays field-level errors from API', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        username: ['A user with that username already exists.'],
        email: ['A user with that email already exists.'],
      }),
    } as Response);

    renderPage();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'taken' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'taken@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/a user with that username already exists/i)).toBeInTheDocument();
      expect(screen.getByText(/a user with that email already exists/i)).toBeInTheDocument();
    });
  });

  it('displays general error with detail key', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Something went wrong on Stripe side' }),
    } as Response);

    renderPage();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@t.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong on stripe side/i)).toBeInTheDocument();
    });
  });

  it('displays network error message', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    renderPage();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@t.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while submitting', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.spyOn(global, 'fetch').mockReturnValueOnce(pendingPromise as Promise<Response>);

    renderPage();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@t.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/redirecting to payment/i)).toBeInTheDocument();
    });

    // Inputs should be disabled
    expect(screen.getByLabelText(/username/i)).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();

    // Resolve to avoid unhandled promise
    resolvePromise!({
      ok: true,
      json: async () => ({ checkout_url: 'https://test.com', session_id: 'cs_1' }),
    });
  });
});
