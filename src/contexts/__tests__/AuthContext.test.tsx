import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

const TestComponent = () => {
  const { user, token, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{JSON.stringify(user)}</span>
      <span data-testid="token">{token}</span>
      <button
        data-testid="login"
        onClick={() => login({ token: 'test-token-123', username: 'testuser', user_id: 1 })}
      >
        Login
      </button>
      <button data-testid="logout" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

const renderWithAuth = () =>
  render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with null user and token when localStorage is empty', () => {
    renderWithAuth();
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('');
  });

  it('login sets user and token', async () => {
    renderWithAuth();
    fireEvent.click(screen.getByTestId('login'));

    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('test-token-123');
      const user = JSON.parse(screen.getByTestId('user').textContent!);
      expect(user.username).toBe('testuser');
    });
  });

  it('login persists to localStorage', async () => {
    renderWithAuth();
    fireEvent.click(screen.getByTestId('login'));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token-123');
      const stored = JSON.parse(localStorage.getItem('user')!);
      expect(stored.username).toBe('testuser');
    });
  });

  it('logout clears user and token', async () => {
    renderWithAuth();
    fireEvent.click(screen.getByTestId('login'));
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('test-token-123');
    });

    fireEvent.click(screen.getByTestId('logout'));
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('token').textContent).toBe('');
    });
  });

  it('logout removes from localStorage', async () => {
    renderWithAuth();
    fireEvent.click(screen.getByTestId('login'));
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token-123');
    });

    fireEvent.click(screen.getByTestId('logout'));
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  it('restores user and token from localStorage on mount', () => {
    localStorage.setItem('token', 'restored-token');
    localStorage.setItem('user', JSON.stringify({ username: 'restored', token: 'restored-token' }));

    renderWithAuth();
    expect(screen.getByTestId('token').textContent).toBe('restored-token');
    const user = JSON.parse(screen.getByTestId('user').textContent!);
    expect(user.username).toBe('restored');
  });
});
