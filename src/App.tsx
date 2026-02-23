import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/auth-context'
import { DashboardRouteGuard } from '@/components/auth/dashboard-route-guard'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AdminLayout } from '@/components/layout/admin-layout'
import { AdminRouteGuard } from '@/components/admin/admin-route-guard'
import { LandingPage } from '@/pages/landing'
import { AuthPage } from '@/pages/auth'
import { AuthOAuthCallbackPage } from '@/pages/auth-oauth-callback'
import { VerifyEmailPage } from '@/pages/verify-email'
import { PasswordResetPage } from '@/pages/password-reset'
import { PasswordResetRedirect } from '@/pages/password-reset-redirect'
import { PasswordResetRequestPage } from '@/pages/auth/password-reset-request'
import { PasswordResetResetPage } from '@/pages/auth/password-reset-reset'
import { DashboardOverview } from '@/pages/dashboard/overview'
import { ProjectsListPage } from '@/pages/projects-list'
import { ProjectWorkspace } from '@/pages/dashboard/project-workspace'
import { ProjectAnalyticsPage } from '@/pages/dashboard/project-analytics'
import { DecisionDetail } from '@/pages/dashboard/decision-detail'
import { CreateDecisionPage } from '@/pages/dashboard/create-decision'
import { TemplatesLibraryPage } from '@/pages/dashboard/templates-library'
import { LibraryPage } from '@/pages/dashboard/library'
import { ExportsPage } from '@/pages/dashboard/exports'
import { NotificationsPage } from '@/pages/dashboard/notifications'
import { BillingPage } from '@/pages/dashboard/billing'
import { SettingsLayout } from '@/pages/dashboard/settings/settings-layout'
import { SettingsIndex } from '@/pages/dashboard/settings/settings-index'
import { ProfilePage } from '@/pages/dashboard/settings/profile-page'
import { TeamPage } from '@/pages/dashboard/settings/team-page'
import { IntegrationsPage } from '@/pages/dashboard/settings/integrations-page'
import { DataPage } from '@/pages/dashboard/settings/data-page'
import { SubscriptionsPage } from '@/pages/dashboard/settings/subscriptions-page'
import { ProjectDefaultsPage } from '@/pages/dashboard/settings/project-defaults-page'
import { BackupsPage } from '@/pages/dashboard/settings/backups-page'
import { DecisionsListPage } from '@/pages/decisions-list'
import { ClientPortalLayout } from '@/components/client-portal'
import { PortalDecisionsPage } from '@/pages/client-portal/portal-decisions-page'
import { PortalDecisionDetailPage } from '@/pages/client-portal/portal-decision-detail-page'
import { ClientConfirmationPage } from '@/pages/client-confirmation'
import { ActionSuccessPage } from '@/pages/dashboard/action-success'
import { AboutPage } from '@/pages/about'
import { HelpPage } from '@/pages/help'
import { HelpArticlePage } from '@/pages/help-article'
import { HelpLayout } from '@/components/layout/help-layout'
import { PrivacyPage } from '@/pages/privacy'
import { TermsPage } from '@/pages/terms'
import { RequestDemoPage } from '@/pages/request-demo'
import { PricingPage } from '@/pages/pricing'
import { NotFoundPage } from '@/pages/not-found'
import { ServerErrorPageRoute } from '@/pages/server-error'
import { GlobalErrorBoundary, ServerErrorGate } from '@/components/500'
import { AdminLoginPage } from '@/pages/admin/admin-login'
import { AdminDashboardPage } from '@/pages/admin/admin-dashboard'
import { AdminAnalyticsPage } from '@/pages/admin/admin-analytics'
import { AdminUsersPage } from '@/pages/admin/admin-users'
import { AdminSessionsPage } from '@/pages/admin/admin-sessions'
import { AdminTicketsPage } from '@/pages/admin/admin-tickets'
import { AdminSettingsPage } from '@/pages/admin/admin-settings'

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
      <GlobalErrorBoundary>
        <BrowserRouter>
          <ServerErrorGate>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/login" element={<AuthPage />} />
                <Route path="/auth/password-reset/request" element={<PasswordResetRequestPage />} />
                <Route path="/auth/password-reset/reset" element={<PasswordResetResetPage />} />
                <Route path="/auth/oauth-callback" element={<AuthOAuthCallbackPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/signup" element={<AuthPage />} />
                <Route path="/verify" element={<VerifyEmailPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/password-reset" element={<PasswordResetPage />} />
                <Route path="/password-reset/confirm" element={<PasswordResetRedirect />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/help" element={<HelpLayout />}>
                  <Route index element={<HelpPage />} />
                  <Route path="article/:slug" element={<HelpArticlePage />} />
                </Route>
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/request-demo" element={<RequestDemoPage />} />
                <Route path="/client/:token/confirmation" element={<ClientConfirmationPage />} />
                <Route path="/client/:token" element={<ClientPortalLayout />}>
                  <Route index element={<PortalDecisionsPage />} />
                  <Route path="decision/:decisionId" element={<PortalDecisionDetailPage />} />
                </Route>

                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route
                  path="/admin"
                  element={
                    <AdminRouteGuard>
                      <AdminLayout />
                    </AdminRouteGuard>
                  }
                >
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="sessions" element={<AdminSessionsPage />} />
                  <Route path="tickets" element={<AdminTicketsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>

                <Route
                  path="/dashboard"
                  element={
                    <DashboardRouteGuard>
                      <DashboardLayout />
                    </DashboardRouteGuard>
                  }
                >
                  <Route index element={<Navigate to="/dashboard/overview" replace />} />
                  <Route path="overview" element={<DashboardOverview />} />
                  <Route path="projects" element={<ProjectsListPage />} />
                  <Route path="projects/:projectId" element={<ProjectWorkspace />} />
                  <Route path="projects/:projectId/analytics" element={<ProjectAnalyticsPage />} />
                  <Route path="projects/:projectId/decisions/new" element={<CreateDecisionPage />} />
                  <Route path="projects/:projectId/decisions/:decisionId" element={<DecisionDetail />} />
                  <Route path="projects/:projectId/actions/:actionId/success" element={<ActionSuccessPage />} />
                  <Route path="projects/:projectId/library" element={<LibraryPage />} />
                  <Route path="library" element={<Navigate to="/dashboard/projects" replace />} />
                  <Route path="projects/:projectId/analytics" element={<ProjectAnalyticsPage />} />
                  <Route path="decisions" element={<DecisionsListPage />} />
                  <Route path="templates" element={<TemplatesLibraryPage />} />
                  <Route path="projects/:projectId/templates" element={<TemplatesLibraryPage />} />
                  <Route path="exports" element={<ExportsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="settings" element={<SettingsLayout />}>
                    <Route index element={<SettingsIndex />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="team" element={<TeamPage />} />
                    <Route path="subscriptions" element={<SubscriptionsPage />} />
                    <Route path="integrations" element={<IntegrationsPage />} />
                    <Route path="project-defaults" element={<ProjectDefaultsPage />} />
                    <Route path="backups" element={<BackupsPage />} />
                    <Route path="data" element={<DataPage />} />
                  </Route>
                </Route>

                <Route path="/500" element={<ServerErrorPageRoute />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AuthProvider>
          </ServerErrorGate>
        </BrowserRouter>
      </GlobalErrorBoundary>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App
