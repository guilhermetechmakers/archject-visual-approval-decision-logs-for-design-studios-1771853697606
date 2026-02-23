/**
 * Studio Settings API
 * Prepares for future REST endpoints; uses existing studios API where available
 */

import { api } from '@/lib/api'
import type {
  BrandingSettings,
  ClientLinkBranding,
  IntegrationsSettings,
  ProjectDefaultsSettings,
  BackupSettings,
  Invoice,
  PaymentMethod,
} from '@/types/settings'

const DEFAULT_STUDIO_ID = 'default'
const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

// Mock data for features not yet backed by server
const MOCK_SUBSCRIPTION = {
  planId: 'pro',
  planName: 'Professional',
  status: 'active' as const,
  trialEnd: null as string | null,
  nextBillingDate: '2025-03-15',
  invoices: [
    { id: 'inv-1', date: '2025-02-15', amount: 49, currency: 'USD', status: 'paid' as const },
    { id: 'inv-2', date: '2025-01-15', amount: 49, currency: 'USD', status: 'paid' as const },
  ],
  paymentMethod: {
    id: 'pm-1',
    type: 'card' as const,
    last4: '4242',
    brand: 'Visa',
    expiryMonth: 12,
    expiryYear: 2026,
    isDefault: true,
  },
  autoRenew: true,
  seats: 10,
  seatsUsed: 3,
}

const MOCK_INTEGRATIONS: IntegrationsSettings = {
  drive: {
    enabled: false,
    provider: 'google_drive',
    folderMappings: [],
    fileTypePreferences: ['pdf', 'dwg', 'png'],
  },
  calendar: {
    enabled: false,
    calendarId: null,
    syncWindow: '14d',
    defaultReminders: ['1d', '1h'],
  },
  bimForge: {
    enabled: false,
    settings: { previewEnabled: true, assetLinkage: false },
  },
}

const MOCK_PROJECT_DEFAULTS: ProjectDefaultsSettings = {
  reminderCadence: 'daily',
  exportFormats: ['pdf', 'csv'],
  autoNotification: true,
}

const MOCK_BACKUPS: BackupSettings = {
  schedule: 'daily',
  lastBackupAt: new Date().toISOString(),
  retentionPeriod: 90,
  exportFormats: ['json', 'csv', 'pdf'],
}

const BRANDING_OVERRIDES_KEY = 'archject_branding_overrides'

function getBrandingOverrides(studioId: string): Partial<BrandingSettings> {
  try {
    const raw = localStorage.getItem(`${BRANDING_OVERRIDES_KEY}_${studioId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setBrandingOverrides(studioId: string, overrides: Partial<BrandingSettings>) {
  try {
    const current = getBrandingOverrides(studioId)
    const merged = { ...current, ...overrides }
    localStorage.setItem(`${BRANDING_OVERRIDES_KEY}_${studioId}`, JSON.stringify(merged))
  } catch {
    // ignore
  }
}

export async function getBranding(studioId: string = DEFAULT_STUDIO_ID): Promise<BrandingSettings> {
  const studio = await api.get<{
    name: string
    logo_url: string | null
    brand_color: string
  }>(`/studios/${studioId}`)
  const overrides = getBrandingOverrides(studioId)
  const primary = studio.brand_color ?? '#0052CC'
  const base = {
    logoUrl: studio.logo_url,
    faviconUrl: null,
    primaryColor: primary,
    secondaryColor: '#6B7280',
    backgroundColor: '#F7F7F9',
    textColor: '#111827',
    accentColor: primary,
    emailTemplates: [],
    clientLinkBranding: {
      enabled: false,
      customDomain: null,
      logoUrl: studio.logo_url,
      colorTokens: {
        primary,
        secondary: '#6B7280',
        background: '#FFFFFF',
        text: '#111827',
        accent: primary,
      },
      domainValidated: false,
    },
  }
  return { ...base, ...overrides }
}

export async function updateBranding(
  studioId: string,
  data: Partial<BrandingSettings>
): Promise<BrandingSettings> {
  if (data.primaryColor) {
    await api.put(`/studios/${studioId}`, { brand_color: data.primaryColor })
  }
  if (data.logoUrl !== undefined) {
    await api.put(`/studios/${studioId}`, { logo_url: data.logoUrl })
  }
  const toStore: Partial<BrandingSettings> = {}
  if (data.faviconUrl !== undefined) toStore.faviconUrl = data.faviconUrl
  if (Object.keys(toStore).length > 0) {
    setBrandingOverrides(studioId, toStore)
  }
  return getBranding(studioId)
}

export async function uploadFavicon(file: File): Promise<{ url: string }> {
  const token = localStorage.getItem('auth_token')
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/uploads/logo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? 'Upload failed')
  }
  const data = await res.json()
  return { url: data.url ?? data.signedUrl }
}

const CLIENT_LINKS_KEY = 'archject_client_link_branding'

function getClientLinkOverrides(studioId: string): Partial<ClientLinkBranding> | null {
  try {
    const raw = localStorage.getItem(`${CLIENT_LINKS_KEY}_${studioId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setClientLinkOverrides(studioId: string, data: Partial<ClientLinkBranding>) {
  try {
    const current = getClientLinkOverrides(studioId)
    const merged = current ? { ...current, ...data } : data
    localStorage.setItem(`${CLIENT_LINKS_KEY}_${studioId}`, JSON.stringify(merged))
  } catch {
    // ignore
  }
}

export async function getClientLinkBranding(
  studioId: string
): Promise<ClientLinkBranding> {
  const branding = await getBranding(studioId)
  const overrides = getClientLinkOverrides(studioId)
  if (!overrides) return branding.clientLinkBranding
  return {
    ...branding.clientLinkBranding,
    ...overrides,
    colorTokens: overrides.colorTokens
      ? { ...branding.clientLinkBranding.colorTokens, ...overrides.colorTokens }
      : branding.clientLinkBranding.colorTokens,
  }
}

export async function updateClientLinkBranding(
  studioId: string,
  data: Partial<ClientLinkBranding>
): Promise<ClientLinkBranding> {
  const current = await getClientLinkBranding(studioId)
  const updated: ClientLinkBranding = {
    ...current,
    ...data,
    colorTokens: data.colorTokens
      ? { ...current.colorTokens, ...data.colorTokens }
      : current.colorTokens,
  }
  setClientLinkOverrides(studioId, updated)
  return updated
}

const INTEGRATIONS_KEY = 'archject_integrations'

function getIntegrationsOverrides(studioId: string): Partial<IntegrationsSettings> | null {
  try {
    const raw = localStorage.getItem(`${INTEGRATIONS_KEY}_${studioId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setIntegrationsOverrides(studioId: string, data: Partial<IntegrationsSettings>) {
  try {
    const current = getIntegrationsOverrides(studioId) ?? {}
    const merged = { ...current, ...data }
    localStorage.setItem(`${INTEGRATIONS_KEY}_${studioId}`, JSON.stringify(merged))
  } catch {
    // ignore
  }
}

export async function getIntegrations(
  studioId: string = DEFAULT_STUDIO_ID
): Promise<IntegrationsSettings> {
  const overrides = getIntegrationsOverrides(studioId)
  const base = { ...MOCK_INTEGRATIONS }
  if (overrides) {
    if (overrides.drive) base.drive = { ...base.drive, ...overrides.drive }
    if (overrides.calendar) base.calendar = { ...base.calendar, ...overrides.calendar }
    if (overrides.bimForge) base.bimForge = { ...base.bimForge, ...overrides.bimForge }
  }
  return base
}

export async function updateIntegration(
  studioId: string,
  provider: 'drive' | 'calendar' | 'bimForge',
  data: Record<string, unknown>
): Promise<IntegrationsSettings> {
  const current = await getIntegrations(studioId)
  const updated = { ...current }
  if (provider === 'drive') {
    updated.drive = { ...current.drive, ...data } as IntegrationsSettings['drive']
  } else if (provider === 'calendar') {
    updated.calendar = { ...current.calendar, ...data } as IntegrationsSettings['calendar']
  } else {
    updated.bimForge = { ...current.bimForge, ...data } as IntegrationsSettings['bimForge']
  }
  setIntegrationsOverrides(studioId, updated)
  return updated
}

const DEFAULTS_KEY = 'archject_project_defaults'

function getDefaultsOverrides(studioId: string): Partial<ProjectDefaultsSettings> | null {
  try {
    const raw = localStorage.getItem(`${DEFAULTS_KEY}_${studioId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setDefaultsOverrides(studioId: string, data: Partial<ProjectDefaultsSettings>) {
  try {
    const current = getDefaultsOverrides(studioId) ?? {}
    const merged = { ...current, ...data }
    localStorage.setItem(`${DEFAULTS_KEY}_${studioId}`, JSON.stringify(merged))
  } catch {
    // ignore
  }
}

export async function getProjectDefaults(
  studioId: string = DEFAULT_STUDIO_ID
): Promise<ProjectDefaultsSettings> {
  const overrides = getDefaultsOverrides(studioId)
  return { ...MOCK_PROJECT_DEFAULTS, ...overrides }
}

export async function updateProjectDefaults(
  studioId: string,
  data: Partial<ProjectDefaultsSettings>
): Promise<ProjectDefaultsSettings> {
  setDefaultsOverrides(studioId, data)
  return getProjectDefaults(studioId)
}

const BACKUPS_KEY = 'archject_backups'

function getBackupsOverrides(studioId: string): Partial<BackupSettings> | null {
  try {
    const raw = localStorage.getItem(`${BACKUPS_KEY}_${studioId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setBackupsOverrides(studioId: string, data: Partial<BackupSettings>) {
  try {
    const current = getBackupsOverrides(studioId) ?? {}
    const merged = { ...current, ...data }
    localStorage.setItem(`${BACKUPS_KEY}_${studioId}`, JSON.stringify(merged))
  } catch {
    // ignore
  }
}

export async function getBackups(
  studioId: string = DEFAULT_STUDIO_ID
): Promise<BackupSettings> {
  const overrides = getBackupsOverrides(studioId)
  return { ...MOCK_BACKUPS, ...overrides }
}

export async function updateBackupSchedule(
  studioId: string,
  schedule: 'daily' | 'weekly'
): Promise<BackupSettings> {
  setBackupsOverrides(DEFAULT_STUDIO_ID, { schedule })
  return getBackups(studioId)
}

export async function triggerBackupExport(
  _studioId: string,
  _format: 'json' | 'csv' | 'pdf'
): Promise<{ exportId: string; status: string }> {
  return {
    exportId: `exp-${Date.now()}`,
    status: 'processing',
  }
}

export async function getSubscription(
  studioId: string = DEFAULT_STUDIO_ID
): Promise<typeof MOCK_SUBSCRIPTION> {
  try {
    const res = await api.get<typeof MOCK_SUBSCRIPTION>(
      `/studios/${studioId}/subscription`
    )
    return res
  } catch {
    return MOCK_SUBSCRIPTION
  }
}

export async function getInvoices(
  studioId: string = DEFAULT_STUDIO_ID
): Promise<Invoice[]> {
  try {
    const res = await api.get<{ invoices: Invoice[] }>(
      `/studios/${studioId}/subscription/invoices`
    )
    return res.invoices ?? []
  } catch {
    return MOCK_SUBSCRIPTION.invoices
  }
}

export async function getPaymentMethods(
  studioId: string = DEFAULT_STUDIO_ID
): Promise<PaymentMethod[]> {
  try {
    const res = await api.get<{ methods: PaymentMethod[] }>(
      `/studios/${studioId}/subscription/payment-methods`
    )
    return res.methods ?? []
  } catch {
    return MOCK_SUBSCRIPTION.paymentMethod
      ? [MOCK_SUBSCRIPTION.paymentMethod]
      : []
  }
}
