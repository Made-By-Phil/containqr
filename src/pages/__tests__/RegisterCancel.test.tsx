import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import RegisterCancel from '../RegisterCancel';

const renderPage = () =>
  render(
    <BrowserRouter>
      <RegisterCancel />
    </BrowserRouter>
  );

describe('RegisterCancel', () => {
  it('renders cancellation heading', () => {
    renderPage();
    expect(screen.getByText(/registration cancelled/i)).toBeInTheDocument();
  });

  it('shows no charges message', () => {
    renderPage();
    expect(screen.getByText(/no charges have been made/i)).toBeInTheDocument();
  });

  it('has try again link to register', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /try again/i });
    expect(link).toHaveAttribute('href', '/register');
  });

  it('has go home link', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /go home/i });
    expect(link).toHaveAttribute('href', '/');
  });
});
