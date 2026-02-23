import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from '../progress-bar'

describe('ProgressBar', () => {
  it('renders determinate progress with value', () => {
    render(<ProgressBar value={50} />)
    const bar = screen.getByRole('progressbar', { name: /50% complete/i })
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveAttribute('aria-valuenow', '50')
  })

  it('renders indeterminate with accessible label', () => {
    render(<ProgressBar indeterminate />)
    const bar = screen.getByRole('progressbar', { name: /Processing/i })
    expect(bar).toBeInTheDocument()
  })
})
