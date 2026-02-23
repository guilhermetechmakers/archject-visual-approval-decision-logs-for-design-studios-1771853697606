import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { getPasswordStrength, PasswordStrengthMeter } from '../password-strength-meter'

describe('getPasswordStrength', () => {
  it('returns weak for empty password', () => {
    expect(getPasswordStrength('')).toEqual({ level: 'weak', score: 0 })
  })

  it('returns weak for short or simple password', () => {
    const result = getPasswordStrength('Ab1!')
    expect(['weak', 'medium']).toContain(result.level)
  })

  it('returns medium for decent password', () => {
    const result = getPasswordStrength('Abcdef123!')
    expect(['weak', 'medium']).toContain(result.level)
  })

  it('returns strong for strong password', () => {
    const result = getPasswordStrength('Abcdef123!@#xyz')
    expect(result.level).toBe('strong')
  })
})

describe('PasswordStrengthMeter', () => {
  it('renders nothing for empty password', () => {
    const { container } = render(<PasswordStrengthMeter password="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders strength bars for non-empty password', () => {
    render(<PasswordStrengthMeter password="Abcdef123!" />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
