import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  reportError,
  extractIncidentIdFromResponse,
} from '@/services/error-reporter'

describe('ErrorReporter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  describe('extractIncidentIdFromResponse', () => {
    it('extracts incidentId from response object', () => {
      const data = { incidentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }
      expect(extractIncidentIdFromResponse(data)).toBe(data.incidentId)
    })

    it('extracts correlationId as fallback', () => {
      const data = { correlationId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }
      expect(extractIncidentIdFromResponse(data)).toBe(data.correlationId)
    })

    it('returns null for invalid UUID', () => {
      expect(extractIncidentIdFromResponse({ incidentId: 'not-a-uuid' })).toBeNull()
    })

    it('returns null for non-object', () => {
      expect(extractIncidentIdFromResponse(null)).toBeNull()
      expect(extractIncidentIdFromResponse(undefined)).toBeNull()
    })
  })

  describe('reportError', () => {
    it('returns incidentId from backend when fetch succeeds', async () => {
      const incidentId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ incidentId, receivedAt: new Date().toISOString() }),
      })

      const result = await reportError({
        route: '/test',
        errorMessage: 'Test error',
      })

      expect(result.incidentId).toBe(incidentId)
      expect(result.receivedAt).toBeDefined()
    })

    it('returns client-generated UUID when fetch fails', async () => {
      ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const result = await reportError({
        route: '/test',
        errorMessage: 'Test error',
      })

      expect(result.incidentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
      expect(result.receivedAt).toBeDefined()
    })
  })
})
