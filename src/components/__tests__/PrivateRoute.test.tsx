import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import PrivateRoute from '../PrivateRoute';

const renderWithAuth = (initialPath = '/protected') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/protected"
            element={
              <PrivateRoute>
                <div>Protected Content</div>
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('PrivateRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders children when user is authenticated', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ username: 'testuser', token: 'test-token' }));

    renderWithAuth();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    renderWithAuth();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
