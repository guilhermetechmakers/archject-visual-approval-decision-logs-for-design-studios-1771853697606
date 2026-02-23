import { api } from '@/lib/api'

export interface BrandingPreview {
  studioId: string
  name: string
  logoUrl: string | null
  logoAlt: string
  primaryColor: string
  customDomain: string | null
}

export const brandingApi = {
  getPreview: (studioId: string) =>
    api.get<BrandingPreview>(`/branding/${studioId}/preview`),
}
