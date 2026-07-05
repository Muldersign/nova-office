import type { PrintableDocument } from '../foundation/documents.ts'
import { isValidEmail, validateDocumentLines } from '../foundation/business.ts'

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
  if (!isValidEmail(payload.to) || !isValidEmail(payload.from) || !isValidEmail(payload.replyTo)) {
    throw new Error('Controleer ontvanger, afzender en antwoordadres.')
  }

  if (!payload.subject.trim() || !payload.body.trim() || !payload.filename.trim()) {
    throw new Error('Onderwerp, bericht en bestandsnaam zijn verplicht.')
  }

  const lineValidation = validateDocumentLines(payload.document.lines)
  if (!lineValidation.ok) {
    throw new Error(lineValidation.message)
  }

  const response = await fetch('/api/document-send.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await response.json().catch(() => ({} as { error?: string; message?: string }))

  if (!response.ok) {
    throw new Error(result.error ?? result.message ?? 'Document kon niet worden verstuurd.')
  }

  return result.message ?? 'Document is verstuurd.'
}
