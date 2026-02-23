-- Branding extensions: favicon, client link branding, project defaults
ALTER TABLE studios ADD COLUMN branding_favicon_url TEXT;
ALTER TABLE studios ADD COLUMN client_link_branding TEXT; -- JSON: {enabled, customDomain, domainValidated}
ALTER TABLE studios ADD COLUMN project_defaults TEXT; -- JSON: {reminderCadence, exportFormats, autoNotification}
