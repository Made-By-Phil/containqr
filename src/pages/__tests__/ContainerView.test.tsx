import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContainerView from '../ContainerView';

let mockToken: string | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: mockToken }),
}));

const makeContainer = (overrides = {}) => ({
  id: 1,
  uuid: 'abc-123',
  readable_id: 'GAB01',
  name: 'Holiday Supplies',
  location: 'Garage',
  color: 'blue',
  is_password_protected: false,
  items: [
    { id: 1, name: 'Lights', quantity: 3 },
    { id: 2, name: 'Ornaments', quantity: 12 },
  ],
  texts: [],
  photos: [],
  created_at: '2025-12-01T00:00:00Z',
  updated_at: '2025-12-15T00:00:00Z',
  ...overrides,
});

const renderPage = (uuid = 'abc-123', username = 'phil') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/${username}/${uuid}`]}>
        <Routes>
          <Route path="/:username/:containerId" element={<ContainerView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ContainerView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockToken = null;
  });

  it('shows loading state initially', () => {
    // Never-resolving fetch keeps it in loading state
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders container name and location on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeContainer(),
    } as Response);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Holiday Supplies')).toBeInTheDocument();
    });
    expect(screen.getByText('Garage')).toBeInTheDocument();
  });

  it('renders item list with quantities', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeContainer(),
    } as Response);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Lights')).toBeInTheDocument();
    });
    expect(screen.getByText('Ornaments')).toBeInTheDocument();
    // Quantities > 1 show badges
    expect(screen.getByText(/×3/)).toBeInTheDocument();
    expect(screen.getByText(/×12/)).toBeInTheDocument();
  });

  it('renders text content when container has texts', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeContainer({
          items: [],
          texts: [{ id: 1, text: 'Christmas decorations including tree stand' }],
        }),
    } as Response);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/christmas decorations including tree stand/i)).toBeInTheDocument();
    });
  });

  it('shows "No contents added yet" for empty container', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeContainer({ items: [], texts: [], photos: [] }),
    } as Response);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no contents added yet/i)).toBeInTheDocument();
    });
  });

  it('shows "Container Not Found" on 404', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found.' }),
    } as Response);

    renderPage('nonexistent-uuid');
    await waitFor(() => {
      expect(screen.getByText(/container not found/i)).toBeInTheDocument();
    });
  });

  it('shows password-protected screen on 401', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Password protected' }),
    } as Response);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/password protected/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /log in to view/i })).toHaveAttribute('href', '/login');
  });

  it('sends auth token when user is logged in', async () => {
    mockToken = 'tok_abc';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeContainer(),
    } as Response);

    renderPage();
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options?.headers?.['Authorization']).toBe('Token tok_abc');
  });

  it('does not send auth header when user is not logged in', async () => {
    mockToken = null;
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeContainer(),
    } as Response);

    renderPage();
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options?.headers?.['Authorization']).toBeUndefined();
  });

  it('displays readable_id and username in header', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeContainer(),
    } as Response);

    renderPage('abc-123', 'phil');
    await waitFor(() => {
      expect(screen.getByText('phil/GAB01')).toBeInTheDocument();
    });
  });
});
