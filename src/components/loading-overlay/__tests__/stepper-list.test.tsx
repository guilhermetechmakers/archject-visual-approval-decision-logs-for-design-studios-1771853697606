import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepperList } from '../stepper-list'

describe('StepperList', () => {
  it('renders steps', () => {
    const steps = [
      { name: 'Queued', status: 'completed' as const },
      { name: 'Preparing', status: 'in_progress' as const },
      { name: 'Generating', status: 'pending' as const },
    ]
    render(<StepperList steps={steps} />)
    expect(screen.getByText('Queued')).toBeInTheDocument()
    expect(screen.getByText('Preparing')).toBeInTheDocument()
    expect(screen.getByText('Generating')).toBeInTheDocument()
  })

  it('returns null when steps is empty', () => {
    const { container } = render(<StepperList steps={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
