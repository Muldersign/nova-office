import type { RoleName } from './business.ts'

export type InviteDraft = {
  companyName: string
  inviterName: string
  inviteeName: string
  inviteeEmail: string
  role: RoleName
  token: string
  origin: string
}

export function createInviteToken(email: string, companyId: string, timestamp = Date.now()) {
  return btoa(`${email.trim().toLowerCase()}|${companyId}|${timestamp}`).replaceAll('=', '')
}

export function createInviteLink(origin: string, token: string) {
  const base = origin.replace(/\/$/, '')
  return `${base}/?invite=${encodeURIComponent(token)}`
}

export function createInviteEmail(draft: InviteDraft) {
  const link = createInviteLink(draft.origin, draft.token)
  return {
    subject: `${draft.companyName} nodigt je uit voor Brenqo`,
    body: [
      `Hoi ${draft.inviteeName},`,
      '',
      `${draft.inviterName} heeft je uitgenodigd voor ${draft.companyName} in Brenqo als ${draft.role}.`,
      `Open je uitnodiging: ${link}`,
      '',
      'Deze uitnodiging is voorbereid vanuit de MVP. Zodra e-mailverzending actief is, verstuurt Brenqo dit automatisch.',
    ].join('\n'),
    link,
  }
}

export function safeDocumentFilename(prefix: string, number: string, extension: 'html' | 'pdf' = 'html') {
  const safeNumber = number.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
  return `${prefix}-${safeNumber || 'document'}.${extension}`
}
