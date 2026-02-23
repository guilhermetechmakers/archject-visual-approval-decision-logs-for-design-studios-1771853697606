import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ServerErrorPage } from '../server-error-page'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ServerErrorPage', () => {
  it('renders headline and copy', () => {
    renderWithRouter(
      <ServerErrorPage incidentId="f47ac10b-58cc-4372-a567-0e02b2c3d479" />
    )
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(screen.getByText(/we hit an internal error/i)).toBeInTheDocument()
  })

  it('displays incident ID', () => {
    const id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    renderWithRouter(<ServerErrorPage incidentId={id} />)
    expect(screen.getByText(id)).toBeInTheDocument()
  })

  it('shows Retry button', () => {
    renderWithRouter(
      <ServerErrorPage incidentId="f47ac10b-58cc-4372-a567-0e02b2c3d479" />
    )
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows Contact support and Back to dashboard', () => {
    renderWithRouter(
      <ServerErrorPage incidentId="f47ac10b-58cc-4372-a567-0e02b2c3d479" />
    )
    expect(screen.getByRole('button', { name: /contact support/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument()
  })

  it('calls onRetry when Retry is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderWithRouter(
      <ServerErrorPage
        incidentId="f47ac10b-58cc-4372-a567-0e02b2c3d479"
        onRetry={onRetry}
      />
    )
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalled()
  })
})
