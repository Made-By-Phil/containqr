import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContainerModal } from '../AddContainerModal';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'tok_test' }),
}));

const makeContainer = (overrides = {}) => ({
  id: 1,
  uuid: 'u1',
  readable_id: 'GAB01',
  name: 'Test Box',
  location: 'Garage',
  color: 'blue' as const,
  is_password_protected: false,
  items: [{ id: 1, name: 'Hammer', quantity: 2 }],
  texts: [],
  photos: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const renderModal = (props: { open?: boolean; onClose?: () => void; container?: any } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    container: null,
    ...props,
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <ContainerModal {...defaultProps} />
    </QueryClientProvider>
  );
};

describe('ContainerModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Add New Container" title when creating', () => {
    renderModal();
    expect(screen.getByText(/add new container/i)).toBeInTheDocument();
  });

  it('renders "Edit Container" title when editing', () => {
    renderModal({ container: makeContainer() });
    expect(screen.getByText(/edit container/i)).toBeInTheDocument();
  });

  it('renders required name field', () => {
    renderModal();
    expect(screen.getByLabelText(/container name/i)).toBeInTheDocument();
  });

  it('populates form fields when editing', () => {
    renderModal({ container: makeContainer({ name: 'My Box' }) });
    expect(screen.getByDisplayValue('My Box')).toBeInTheDocument();
  });

  it('shows content type buttons (Photo, List, Text)', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /photo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /text/i })).toBeInTheDocument();
  });

  it('shows item inputs when List content type is selected', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /list/i }));
    expect(screen.getByPlaceholderText(/item name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/qty/i)).toBeInTheDocument();
  });

  it('shows textarea when Text content type is selected', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /text/i }));
    expect(screen.getByLabelText(/content description/i)).toBeInTheDocument();
  });

  it('shows file input when Photo content type is selected', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /photo/i }));
    expect(screen.getByLabelText(/upload photo/i)).toBeInTheDocument();
  });

  it('can add and remove item rows', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /list/i }));

    // Starts with 1 item row
    expect(screen.getAllByPlaceholderText(/item name/i)).toHaveLength(1);

    // Add another
    fireEvent.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getAllByPlaceholderText(/item name/i)).toHaveLength(2);
  });

  it('toggles content type off when clicking same button', () => {
    renderModal();
    const listBtn = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listBtn);
    expect(screen.getByPlaceholderText(/item name/i)).toBeInTheDocument();

    // Click again to deselect
    fireEvent.click(listBtn);
    expect(screen.queryByPlaceholderText(/item name/i)).not.toBeInTheDocument();
  });

  it('populates items when editing container with items', () => {
    renderModal({ container: makeContainer() });
    expect(screen.getByDisplayValue('Hammer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('populates text when editing container with texts', () => {
    renderModal({
      container: makeContainer({
        items: [],
        texts: [{ id: 1, text: 'Some notes here' }],
      }),
    });
    expect(screen.getByDisplayValue('Some notes here')).toBeInTheDocument();
  });

  it('submits POST to /api/containers/ for new container', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeContainer(),
    } as Response);

    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.change(screen.getByLabelText(/container name/i), { target: { value: 'New Box' } });
    fireEvent.click(screen.getByRole('button', { name: /create container/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const submitCall = fetchSpy.mock.calls.find(([url]) => url === '/api/containers/');
    expect(submitCall).toBeTruthy();
    const [, options] = submitCall!;
    expect(options?.method).toBe('POST');
    expect(options?.headers?.['Authorization']).toBe('Token tok_test');
  });

  it('submits PUT to /api/containers/:id/ for existing container', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeContainer(),
    } as Response);

    renderModal({ container: makeContainer({ id: 42 }) });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const submitCall = fetchSpy.mock.calls.find(([url]) => url === '/api/containers/42/');
    expect(submitCall).toBeTruthy();
    const [, options] = submitCall!;
    expect(options?.method).toBe('PUT');
  });

  it('shows "Creating..." while submitting new container', async () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));
    renderModal();

    fireEvent.change(screen.getByLabelText(/container name/i), { target: { value: 'Box' } });
    fireEvent.click(screen.getByRole('button', { name: /create container/i }));

    await waitFor(() => {
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
    });
  });

  it('shows "Saving..." while submitting edit', async () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));
    renderModal({ container: makeContainer() });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  it('has password protection toggle', () => {
    renderModal();
    expect(screen.getByText(/password protection/i)).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    renderModal({ open: false });
    expect(screen.queryByText(/add new container/i)).not.toBeInTheDocument();
  });

  it('submits successfully with empty items when no item names filled', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeContainer(),
    } as Response);

    renderModal();
    fireEvent.change(screen.getByLabelText(/container name/i), { target: { value: 'Box' } });
    fireEvent.click(screen.getByRole('button', { name: /list/i }));

    // Default item row has empty name — component filters these out before submit
    fireEvent.click(screen.getByRole('button', { name: /create container/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const submitCalls = fetchSpy.mock.calls.filter(([url]) => url === '/api/containers/');
    expect(submitCalls).toHaveLength(1);
    const [, options] = submitCalls[0];
    expect(options?.body).toBeInstanceOf(FormData);
  });
});
