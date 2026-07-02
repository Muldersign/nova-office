import {
  createCustomer,
  createInvoice,
  createQuote,
  listCustomers,
  listInvoices,
  listQuotes,
  updateInvoiceStatus,
} from './repository.ts'
import type { CustomerRecord, DocumentLineRecord, InvoiceRecord, NovaDatabase, QuoteRecord } from './schema.ts'

type ApiContext = {
  userId: string
  companyId: string
}

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string }

function success<T>(status: number, data: T): ApiResult<T> {
  return { ok: true, status, data }
}

function failure(error: unknown): ApiResult<never> {
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return { ok: false, status: 403, error: 'Geen toegang tot deze administratie.' }
  }

  if (error instanceof Error && error.message === 'NOT_FOUND') {
    return { ok: false, status: 404, error: 'Niet gevonden binnen deze administratie.' }
  }

  return { ok: false, status: 500, error: 'Onverwachte serverfout.' }
}

export const api = {
  customers: {
    list(database: NovaDatabase, context: ApiContext) {
      try {
        return success(200, listCustomers(database, context))
      } catch (error) {
        return failure(error)
      }
    },
    create(
      database: NovaDatabase,
      context: ApiContext,
      input: Omit<CustomerRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ) {
      try {
        return success(201, createCustomer(database, context, input))
      } catch (error) {
        return failure(error)
      }
    },
  },
  invoices: {
    list(database: NovaDatabase, context: ApiContext) {
      try {
        return success(200, listInvoices(database, context))
      } catch (error) {
        return failure(error)
      }
    },
    create(
      database: NovaDatabase,
      context: ApiContext,
      input: Omit<InvoiceRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
      items: Array<Omit<DocumentLineRecord, 'id' | 'companyId' | 'parentId'>>,
    ) {
      try {
        return success(201, createInvoice(database, context, input, items))
      } catch (error) {
        return failure(error)
      }
    },
    markPaid(database: NovaDatabase, context: ApiContext, invoiceId: string) {
      try {
        return success(200, updateInvoiceStatus(database, context, invoiceId, 'paid'))
      } catch (error) {
        return failure(error)
      }
    },
  },
  quotes: {
    list(database: NovaDatabase, context: ApiContext) {
      try {
        return success(200, listQuotes(database, context))
      } catch (error) {
        return failure(error)
      }
    },
    create(
      database: NovaDatabase,
      context: ApiContext,
      input: Omit<QuoteRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
      items: Array<Omit<DocumentLineRecord, 'id' | 'companyId' | 'parentId'>>,
    ) {
      try {
        return success(201, createQuote(database, context, input, items))
      } catch (error) {
        return failure(error)
      }
    },
  },
}
