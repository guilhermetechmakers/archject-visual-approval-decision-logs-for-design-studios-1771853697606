import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTemplates,
  createDecision,
  updateDecision,
  publishDecision,
  type DraftDecision,
  type DecisionOptionDraft,
} from '@/api/decisions-create'
import { TemplateSelector } from './template-selector'
import { OptionsEditor } from './options-editor'
import { AttachmentsStep } from './attachments-step'
import { SettingsPanel } from './settings-panel'
import { PreviewPanel } from './preview-panel'
import { ActionBar } from './action-bar'
import { LoadingPage } from './loading-page'
import type { ValidationError } from './validation-summary'

const STEPS = ['Template', 'Options', 'Attachments', 'Recipients', 'Preview'] as const

export interface CreateDecisionWizardProps {
  projectId: string
  onPublishSuccess?: (decisionId: string, clientLink: string) => void
  onCancel?: () => void
}

export function CreateDecisionWizard({
  projectId,
  onPublishSuccess,
  onCancel,
}: CreateDecisionWizardProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<DraftDecision>({
    projectId,
    title: '',
    description: '',
    options: [],
    attachments: [],
    reminders: [],
    recipients: [],
    status: 'draft',
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  })

  const templates = templatesData?.templates ?? []

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      navigate(`/dashboard/projects/${projectId}`)
    }
  }, [onCancel, navigate, projectId])

  const saveDraft = useCallback(async () => {
    if (!draft.id) {
      try {
        setIsSavingDraft(true)
        const { decisionId } = await createDecision(
          projectId,
          {
            templateId: selectedTemplateId === '__scratch__' ? undefined : selectedTemplateId ?? undefined,
            fromScratch: selectedTemplateId === '__scratch__',
            title: draft.title || 'Untitled Decision',
            description: draft.description,
            options: draft.options.map((o) => ({
              title: o.title,
              description: o.description,
              isDefault: o.isDefault,
              isRecommended: o.isRecommended,
            })),
          },
          idempotencyKeyRef.current
        )
        setDraft((prev) => ({ ...prev, id: decisionId }))
        toast.success('Draft saved')
      } catch (e) {
        toast.error((e as { message?: string })?.message ?? 'Failed to save draft')
      } finally {
        setIsSavingDraft(false)
      }
    } else {
      try {
        setIsSavingDraft(true)
        await updateDecision(projectId, draft.id, {
          title: draft.title,
          description: draft.description,
          options: draft.options,
          recipients: draft.recipients,
          reminders: draft.reminders,
        })
        toast.success('Draft saved')
      } catch (e) {
        toast.error((e as { message?: string })?.message ?? 'Failed to save draft')
      } finally {
        setIsSavingDraft(false)
      }
    }
  }, [projectId, draft, selectedTemplateId])

  // Autosave draft when user edits (debounced 2s, only after initial save)
  useEffect(() => {
    if (!draft.id || isSavingDraft || isPublishing) return
    const timer = setTimeout(() => {
      saveDraft()
    }, 2000)
    return () => clearTimeout(timer)
  }, [
    draft.id,
    draft.title,
    draft.description,
    draft.options.length,
    draft.recipients.length,
    draft.reminders.length,
    draft.approvalDeadline,
    isSavingDraft,
    isPublishing,
    saveDraft,
  ])

  const handlePublish = useCallback(async () => {
    setValidationErrors([])

    const errors: ValidationError[] = []
    if (!draft.title?.trim()) errors.push({ message: 'Decision title is required' })
    if (draft.options.length === 0) errors.push({ message: 'Add at least one option' })
    if (draft.options.some((o) => !o.title?.trim())) {
      errors.push({ message: 'All options must have a title' })
    }
    if (draft.recipients.filter((r) => r.contactEmail?.trim()).length === 0) {
      errors.push({ field: 'recipients', message: 'Add at least one client recipient to publish' })
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setIsPublishing(true)
      let decisionId = draft.id

      if (!decisionId) {
        const { decisionId: id } = await createDecision(
          projectId,
          {
            templateId: selectedTemplateId === '__scratch__' ? undefined : selectedTemplateId ?? undefined,
            fromScratch: selectedTemplateId === '__scratch__',
            title: draft.title || 'Untitled Decision',
            description: draft.description,
            options: draft.options.map((o) => ({
              title: o.title,
              description: o.description,
              isDefault: o.isDefault,
              isRecommended: o.isRecommended,
            })),
          },
          idempotencyKeyRef.current
        )
        decisionId = id
        setDraft((prev) => ({ ...prev, id }))
      } else {
        await updateDecision(projectId, decisionId, {
          title: draft.title,
          description: draft.description,
          options: draft.options,
          recipients: draft.recipients,
        })
      }

      const { clientLink } = await publishDecision(projectId, decisionId)
      setDraft((prev) => ({ ...prev, status: 'published', clientLink }))

      toast.success('Decision published')
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(clientLink)
        toast.success('Client link copied to clipboard')
      }

      onPublishSuccess?.(decisionId, clientLink)
      navigate(`/dashboard/projects/${projectId}/decisions/${decisionId}`)
    } catch (e) {
      const err = e as { message?: string; details?: Array<{ field?: string; message: string }> }
      const msg = err?.message ?? 'Failed to publish'
      const details = err?.details ?? []
      setValidationErrors(
        details.length > 0
          ? details.map((d) => ({ field: d.field, message: d.message }))
          : [{ message: msg }]
      )
      toast.error(msg)
    } finally {
      setIsPublishing(false)
    }
  }, [projectId, draft, selectedTemplateId, onPublishSuccess, navigate])

  const canPublish =
    !!draft.title?.trim() &&
    draft.options.length > 0 &&
    draft.options.every((o) => o.title?.trim()) &&
    draft.recipients.filter((r) => r.contactEmail?.trim()).length > 0

  const goToStep = (s: number) => {
    if (s >= 1 && s <= 5) setStep(s)
  }

  const handleStep1Continue = () => {
    if (selectedTemplateId === '__scratch__') {
      setDraft((prev) => ({ ...prev, options: [], fromScratch: true }))
    } else if (selectedTemplateId) {
      const t = templates.find((x) => x.id === selectedTemplateId)
      if (t) {
        const opts: DecisionOptionDraft[] = t.defaultOptions.map((o, i) => ({
          id: `opt-${i}`,
          title: o.title,
          description: o.description,
          isDefault: o.isDefault,
          isRecommended: o.isRecommended,
        }))
        setDraft((prev) => ({ ...prev, options: opts, templateId: selectedTemplateId }))
      }
    }
    goToStep(2)
  }

  const handleStep2Continue = () => goToStep(3)
  const handleStep3Continue = () => goToStep(4)
  const handleStep4Continue = () => goToStep(5)

  const optionErrors = draft.options
    .map((o, i) => (!o.title?.trim() ? { optionIndex: i, message: 'Option title is required' } : null))
    .filter((e): e is { optionIndex: number; message: string } => e !== null)

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <nav className="mb-8 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <ChevronRight className="mx-2 inline h-4 w-4" />
            <Link to={`/dashboard/projects/${projectId}`} className="hover:text-foreground">Project</Link>
            <ChevronRight className="mx-2 inline h-4 w-4" />
            <span className="text-foreground">Create decision</span>
          </nav>

          <div className="mb-8">
            <h1 className="text-2xl font-bold">Create decision</h1>
            <p className="mt-1 text-muted-foreground">
              Add a new decision card for client approval
            </p>
          </div>

          <div className="mb-8 flex gap-2">
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => goToStep(i + 1)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  step === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {i + 1}. {label}
              </button>
            ))}
          </div>

          <div className="animate-in">
            {step === 1 && (
              <TemplateSelector
                templates={templates}
                isLoading={templatesLoading}
                selectedId={selectedTemplateId}
                onSelect={setSelectedTemplateId}
                onContinue={handleStep1Continue}
              />
            )}
            {step === 2 && (
              <OptionsEditor
                title={draft.title}
                description={draft.description ?? ''}
                options={draft.options}
                onTitleChange={(t) => setDraft((p) => ({ ...p, title: t }))}
                onDescriptionChange={(d) => setDraft((p) => ({ ...p, description: d }))}
                onOptionsChange={(o) => setDraft((p) => ({ ...p, options: o }))}
                onContinue={handleStep2Continue}
                errors={optionErrors}
              />
            )}
            {step === 3 && (
              <AttachmentsStep
                attachments={draft.attachments ?? []}
                onAttachmentsChange={(a) => setDraft((p) => ({ ...p, attachments: a }))}
                onContinue={handleStep3Continue}
              />
            )}
            {step === 4 && (
              <SettingsPanel
                approvalDeadline={draft.approvalDeadline ?? ''}
                reminders={draft.reminders}
                clientMustTypeNameToConfirm={draft.clientMustTypeNameToConfirm ?? false}
                recipients={draft.recipients}
                onApprovalDeadlineChange={(v) => setDraft((p) => ({ ...p, approvalDeadline: v }))}
                onRemindersChange={(r) => setDraft((p) => ({ ...p, reminders: r }))}
                onClientMustTypeNameChange={(v) => setDraft((p) => ({ ...p, clientMustTypeNameToConfirm: v }))}
                onRecipientsChange={(r) => setDraft((p) => ({ ...p, recipients: r }))}
                onContinue={handleStep4Continue}
                errors={validationErrors}
              />
            )}
            {step === 5 && (
              <PreviewPanel
                decision={draft}
                clientLink={draft.clientLink}
                onCopyLink={() => draft.clientLink && navigator.clipboard?.writeText(draft.clientLink)}
                isPublished={draft.status === 'published'}
              />
            )}
          </div>
        </div>
      </div>

      <ActionBar
        step={step}
        totalSteps={5}
        onBack={() => goToStep(step - 1)}
        onSaveDraft={saveDraft}
        onPublish={handlePublish}
        onCancel={handleCancel}
        isSavingDraft={isSavingDraft}
        isPublishing={isPublishing}
        canPublish={canPublish}
        validationErrors={validationErrors}
      />

      {isPublishing && (
        <LoadingPage
          message="Publishing decision…"
          subtitle="Creating client link and sending notifications"
        />
      )}
    </div>
  )
}
