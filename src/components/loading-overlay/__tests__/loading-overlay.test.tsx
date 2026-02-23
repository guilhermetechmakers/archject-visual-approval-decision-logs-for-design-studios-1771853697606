import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingOverlay } from '../loading-overlay'

describe('LoadingOverlay', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <LoadingOverlay
        operationName="Test"
        open={false}
        onOpenChange={() => {}}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders operation name when open', () => {
    render(
      <LoadingOverlay
        operationName="Generating approval pack"
        open
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByText('Generating approval pack')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(
      <LoadingOverlay
        operationName="Test"
        subtitle="Compiling Decision Log"
        open
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByText('Compiling Decision Log')).toBeInTheDocument()
  })
})
