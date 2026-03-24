import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../Login';

// Mock useAuth
const mockLogin = vi.fn();
const mockNavigate = vi.fn();
let mockUser: any = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, login: mockLogin }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderPage = () =>
  render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );

describe('LoginPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUser = null;
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  it('renders form fields and login button', () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('has a link to register page', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /register/i });
    expect(link).toHaveAttribute('href', '/register');
  });

  it('calls login and clears form on successful submit', async () => {
    const userData = { token: 'tok_123', email: 'test@test.com' };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => userData,
    } as Response);

    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(userData);
    });
  });

  it('shows "Invalid credentials" on 401 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' }),
    } as Response);

    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('shows generic error on network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
    });
  });

  it('redirects to dashboard when user is already logged in', () => {
    mockUser = { token: 'tok_123', email: 'test@test.com' };
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('sends correct POST body to /api/login/', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'tok' }),
    } as Response);

    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@test.com', password: 'secret' }),
      });
    });
  });
});
