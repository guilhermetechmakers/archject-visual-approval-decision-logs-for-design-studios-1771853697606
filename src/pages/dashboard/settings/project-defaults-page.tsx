import { ProjectDefaultsPanel } from './project-defaults-panel'

export function ProjectDefaultsPage() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Project defaults</h1>
        <p className="mt-1 text-muted-foreground">
          Default reminder cadence, export formats, and notification settings for new projects
        </p>
      </div>
      <ProjectDefaultsPanel />
    </div>
  )
}
