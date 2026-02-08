import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';

const mockToken = 'tok_test';
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    token: mockToken,
    user: { username: 'testuser', token: mockToken },
  }),
}));

const containers = [
  {
    id: 1, uuid: 'u1', readable_id: 'GAR01', name: 'Alpha Box',
    location: 'Garage', color: 'blue', is_password_protected: false,
    items: [{ id: 1, name: 'Hammer', quantity: 1 }], texts: [], photos: [],
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z',
  },
  {
    id: 2, uuid: 'u2', readable_id: 'ATR01', name: 'Beta Box',
    location: 'Attic', color: 'red', is_password_protected: false,
    items: [], texts: [{ id: 1, text: 'Old documents' }], photos: [],
    created_at: '2025-03-01T00:00:00Z', updated_at: '2025-03-15T00:00:00Z',
  },
  {
    id: 3, uuid: 'u3', readable_id: 'GAG01', name: 'Charlie Box',
    location: 'Garage', color: 'green', is_password_protected: true,
    items: [], texts: [], photos: [{ id: 1, image: '/api/media/p1/?container=u3' }],
    created_at: '2025-05-01T00:00:00Z', updated_at: '2025-12-01T00:00:00Z',
  },
];

const locations = [
  { id: 1, name: 'Garage' },
  { id: 2, name: 'Attic' },
  { id: 3, name: 'Basement' },
];

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Default: return containers and locations
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.includes('/api/containers/')) {
        return { ok: true, json: async () => containers } as Response;
      }
      if (url.includes('/api/locations/')) {
        return { ok: true, json: async () => locations } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
  });

  it('renders heading and container count', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/my containers/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/3 containers/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders all containers as cards by default', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alpha Box')).toBeInTheDocument();
    });
    expect(screen.getByText('Beta Box')).toBeInTheDocument();
    expect(screen.getByText('Charlie Box')).toBeInTheDocument();
  });

  it('shows empty state when no containers exist', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.includes('/api/containers/')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (url.includes('/api/locations/')) {
        return { ok: true, json: async () => locations } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/no containers yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/create your first container/i)).toBeInTheDocument();
  });

  it('shows item badges on container cards', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Hammer')).toBeInTheDocument();
    });
  });

  it('shows text excerpt on cards with text content', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Old documents')).toBeInTheDocument();
    });
  });

  it('shows photo count on cards with photos', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('1 photo')).toBeInTheDocument();
    });
  });

  it('shows "No contents" for empty container cards', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.includes('/api/containers/')) {
        return {
          ok: true,
          json: async () => [{
            id: 10, uuid: 'u10', readable_id: 'XX01', name: 'Empty',
            location: '', color: 'blue', is_password_protected: false,
            items: [], texts: [], photos: [],
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
          }],
        } as Response;
      }
      if (url.includes('/api/locations/')) {
        return { ok: true, json: async () => [] } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/no contents/i)).toBeInTheDocument();
    });
  });

  it('sends search query to API', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.includes('/api/containers/')) {
        return { ok: true, json: async () => containers } as Response;
      }
      if (url.includes('/api/locations/')) {
        return { ok: true, json: async () => locations } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alpha Box')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'hammer' } });

    await waitFor(() => {
      const containerCalls = fetchSpy.mock.calls.filter(c => String(c[0]).includes('/api/containers/'));
      const lastCall = containerCalls[containerCalls.length - 1];
      expect(String(lastCall[0])).toContain('search=hammer');
    });
  });

  it('sends auth token with API requests', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.includes('/api/containers/')) {
        return { ok: true, json: async () => containers } as Response;
      }
      if (url.includes('/api/locations/')) {
        return { ok: true, json: async () => locations } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    renderDashboard();
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const firstCall = fetchSpy.mock.calls[0];
    expect(firstCall[1]?.headers?.['Authorization']).toBe('Token tok_test');
  });

  it('shows "No matches found" when search has no results and containers exist', async () => {
    // Return containers initially, but the location filter narrows to none
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.includes('/api/containers/') && url.includes('search=zzz')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (url.includes('/api/containers/')) {
        return { ok: true, json: async () => containers } as Response;
      }
      if (url.includes('/api/locations/')) {
        return { ok: true, json: async () => locations } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alpha Box')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'zzz' } });

    await waitFor(() => {
      expect(screen.getByText(/no matches found/i)).toBeInTheDocument();
    });
  });

  it('has an Add Container button that opens the modal', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alpha Box')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /add container/i });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText(/add new container/i)).toBeInTheDocument();
    });
  });

  it('shows readable_id on container cards', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('GAR01')).toBeInTheDocument();
    });
    expect(screen.getByText('ATR01')).toBeInTheDocument();
  });

  it('shows location names on container cards', async () => {
    renderDashboard();
    await waitFor(() => {
      // Multiple "Garage" may appear; at least one should
      expect(screen.getAllByText('Garage').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Attic').length).toBeGreaterThan(0);
  });

  it('handles API failure gracefully via react-query', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      throw new Error('Network error');
    });

    // Should not throw — react-query catches errors
    renderDashboard();
    // After loading resolves, empty state should appear (no containers loaded)
    await waitFor(() => {
      // Either loading finishes with empty data or error is swallowed
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
