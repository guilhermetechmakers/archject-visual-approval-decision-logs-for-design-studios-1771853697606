import { describe, it, expect, vi } from 'vitest'
import {
  retryPage,
  retryRequest,
  retryWithBackoff,
  RetryManager,
} from '@/lib/retry-manager'

describe('RetryManager', () => {
  describe('retryPage', () => {
    it('does not throw when called', () => {
      const reload = vi.fn()
      const origLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { ...origLocation, reload },
        writable: true,
      })
      expect(() => retryPage()).not.toThrow()
      expect(reload).toHaveBeenCalled()
    })
  })

  describe('retryRequest', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue(42)
      const result = await retryRequest(fn)
      expect(result).toBe(42)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries on failure and succeeds', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(100)
      const result = await retryRequest(fn, { maxAttempts: 3 })
      expect(result).toBe(100)
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('throws after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fail'))
      await expect(retryRequest(fn, { maxAttempts: 2 })).rejects.toThrow('always fail')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('retryWithBackoff', () => {
    it('waits for delay', async () => {
      const start = Date.now()
      await retryWithBackoff(1, { baseDelayMs: 50, maxDelayMs: 1000 })
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(90)
    })
  })

  describe('RetryManager export', () => {
    it('exports all methods', () => {
      expect(RetryManager.retryPage).toBe(retryPage)
      expect(RetryManager.retryRequest).toBe(retryRequest)
      expect(RetryManager.retryWithBackoff).toBe(retryWithBackoff)
    })
  })
})
