import type { PrintableDocument } from '../foundation/documents.ts'

export type SendDocumentPayload = {
  to: string
  from: string
  replyTo: string
  subject: string
  body: string
  filename: string
  document: PrintableDocument & {
    title: string
    total: string
  }
}

export async function sendDocumentEmail(payload: SendDocumentPayload) {
  const response = await fetch('/api/document-send.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await response.json().catch(() => ({} as { error?: string; message?: string }))

  if (!response.ok) {
    throw new Error(result.error ?? 'Document kon niet worden verstuurd.')
  }

  return result.message ?? 'Document is verstuurd.'
}
