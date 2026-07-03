import type { PrintableDocument } from '../foundation/documents.ts'

export type PdfDownloadPayload = PrintableDocument & {
  title: string
  filename: string
  total: string
}

export async function downloadServerPdf(payload: PdfDownloadPayload) {
  const response = await fetch('/api/document-pdf.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('PDF-service is niet bereikbaar.')
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
  window.URL.revokeObjectURL(url)
}
