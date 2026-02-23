import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { LandingPage } from '@/pages/landing'
import { LoginPage } from '@/pages/login'
import { SignupPage } from '@/pages/signup'
import { VerifyEmailPage } from '@/pages/verify-email'
import { PasswordResetPage } from '@/pages/password-reset'
import { DashboardOverview } from '@/pages/dashboard/overview'
import { ProjectsListPage } from '@/pages/projects-list'
import { ProjectWorkspace } from '@/pages/dashboard/project-workspace'
import { DecisionDetail } from '@/pages/dashboard/decision-detail'
import { CreateDecisionPage } from '@/pages/dashboard/create-decision'
import { TemplatesPage } from '@/pages/dashboard/templates'
import { LibraryPage } from '@/pages/dashboard/library'
import { ExportsPage } from '@/pages/dashboard/exports'
import { NotificationsPage } from '@/pages/dashboard/notifications'
import { SettingsPage } from '@/pages/dashboard/settings'
import { DecisionsListPage } from '@/pages/decisions-list'
import { ClientPortal } from '@/pages/client-portal'
import { AboutPage } from '@/pages/about'
import { PrivacyPage } from '@/pages/privacy'
import { TermsPage } from '@/pages/terms'
import { NotFoundPage } from '@/pages/not-found'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/password-reset" element={<PasswordResetPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/client/:token" element={<ClientPortal />} />

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:projectId" element={<ProjectWorkspace />} />
            <Route path="projects/:projectId/decisions/new" element={<CreateDecisionPage />} />
            <Route path="projects/:projectId/decisions/:decisionId" element={<DecisionDetail />} />
            <Route path="projects/:projectId/library" element={<LibraryPage />} />
            <Route path="decisions" element={<DecisionsListPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="exports" element={<ExportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App
