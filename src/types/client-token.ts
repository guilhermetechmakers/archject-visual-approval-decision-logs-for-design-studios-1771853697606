export interface ClientTokenValidation {
  valid: boolean
  projectId?: string
  allowedDecisionIds?: string[]
  projectName?: string
}
