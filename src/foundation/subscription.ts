export type PlanName = 'Brenqo Start' | 'Brenqo ZZP' | 'Brenqo MKB' | 'Brenqo Enterprise'

export type PlanUsage = {
  companies: number
  customers: number
  invoices: number
  quotes: number
  teamMembers: number
}

export type PlanLimitKey = keyof PlanUsage

export type PlanDefinition = {
  name: PlanName
  price: string
  audience: string
  limits: Record<PlanLimitKey, number | null>
  features: string[]
}

export const planCatalog: PlanDefinition[] = [
  {
    name: 'Brenqo Start',
    price: 'Gratis beta',
    audience: 'Voor de eerste administratie en MVP-testers',
    limits: { companies: 1, customers: 25, invoices: 50, quotes: 50, teamMembers: 2 },
    features: ['Klanten, facturen en offertes', 'Basis dashboard', 'Documentdownloads'],
  },
  {
    name: 'Brenqo ZZP',
    price: '€ 19 per maand',
    audience: 'Voor zelfstandigen met terugkerende administratie',
    limits: { companies: 2, customers: 150, invoices: 500, quotes: 250, teamMembers: 3 },
    features: ['Alles uit Start', 'Meerdere administraties', 'Uitnodigingsflow'],
  },
  {
    name: 'Brenqo MKB',
    price: '€ 49 per maand',
    audience: 'Voor teams met meer volume en rollen',
    limits: { companies: 5, customers: 1000, invoices: 5000, quotes: 2500, teamMembers: 12 },
    features: ['Alles uit ZZP', 'Teamrollen', 'Auditlog en exports'],
  },
  {
    name: 'Brenqo Enterprise',
    price: 'Op aanvraag',
    audience: 'Voor grotere organisaties en maatwerk',
    limits: { companies: null, customers: null, invoices: null, quotes: null, teamMembers: null },
    features: ['Onbeperkte administraties', 'Dedicated onboarding', 'API en maatwerk SLA'],
  },
]

export function planByName(name: PlanName) {
  return planCatalog.find((plan) => plan.name === name) ?? planCatalog[0]
}

export function usagePercentage(value: number, limit: number | null) {
  if (limit === null) {
    return 0
  }

  return Math.min(100, Math.round((value / Math.max(limit, 1)) * 100))
}

export function isUsageWithinPlan(usage: PlanUsage, plan: PlanDefinition) {
  return (Object.keys(usage) as PlanLimitKey[]).every((key) => {
    const limit = plan.limits[key]
    return limit === null || usage[key] <= limit
  })
}
