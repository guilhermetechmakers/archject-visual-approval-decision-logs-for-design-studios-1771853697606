export interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  docSlug?: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'client-link-1',
    category: 'Client Link',
    question: 'Do clients need to create an account to approve?',
    answer:
      'No. Clients receive a secure tokenized link and can approve or decline directly from any device. No signup or login required.',
    docSlug: 'client-link',
  },
  {
    id: 'client-link-2',
    category: 'Client Link',
    question: 'Can I revoke or regenerate a client link?',
    answer:
      'Yes. You can regenerate links at any time. Previous links will stop working when you create a new one.',
    docSlug: 'client-link',
  },
  {
    id: 'security-1',
    category: 'Security',
    question: 'How is my data protected?',
    answer:
      'All data is encrypted in transit (TLS). Access is controlled via authentication and role-based permissions. We do not share your data with third parties for marketing.',
    docSlug: 'security',
  },
  {
    id: 'exports-1',
    category: 'Exports',
    question: 'What export formats are available?',
    answer:
      'You can export Decision Logs as PDF (branded, print-ready) or CSV (for spreadsheets and integrations).',
    docSlug: 'exports',
  },
  {
    id: 'exports-2',
    category: 'Exports',
    question: 'Can I add my studio logo to PDF exports?',
    answer:
      'Yes. Go to Settings → Branding to upload your logo. It will appear on exported Decision Logs.',
  },
  {
    id: 'billing-1',
    category: 'Billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept major credit cards. Enterprise customers can request invoicing.',
  },
]
