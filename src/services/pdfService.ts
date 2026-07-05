import type { PrintableDocument } from '../foundation/documents.ts'
import { validateDocumentLines } from '../foundation/business.ts'

export type PdfDownloadPayload = PrintableDocument & {
  title: string
  filename: string
  total: string
}

export async function downloadServerPdf(payload: PdfDownloadPayload) {
  if (!payload.filename.trim() || !payload.title.trim()) {
    throw new Error('PDF heeft een titel en bestandsnaam nodig.')
  }

  const lineValidation = validateDocumentLines(payload.lines)
  if (!lineValidation.ok) {
    throw new Error(lineValidation.message)
  }

  const response = await fetch('/api/document-pdf.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const result = await response.json().catch(() => ({} as { error?: string }))
    throw new Error(result.error ?? 'PDF-service is niet bereikbaar.')
  }

  const blob = await response.blob()
  if (!blob.type.includes('pdf')) {
    throw new Error('PDF-service gaf geen PDF terug.')
  }

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = payload.filename
  link.click()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
}
