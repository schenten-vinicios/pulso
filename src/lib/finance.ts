import { z } from 'zod'

const transactionSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['receita', 'despesa']),
  category: z.string(),
  amount_cents: z.number().int().positive().max(1e12),
  description: z.string(),
  counterparty: z.string(),
})
export type Transaction = z.infer<typeof transactionSchema>
export type Filters = { start: string; end: string; category: string }
const metricsSchema = z.object({
  revenue_cents: z.number().int(),
  expenses_cents: z.number().int(),
  result_cents: z.number().int(),
  margin: z.number().nullable(),
  ticket_cents: z.number().nullable(),
  sales: z.number().int(),
})
export const datasetSchema = z.object({
  schema_version: z.literal(1),
  fictional: z.literal(true),
  seed: z.number(),
  business: z.string(),
  business_description: z.string(),
  start: z.string(),
  end: z.string(),
  source_sha256: z.string(),
  categories: z.array(
    z.object({ id: z.string(), label: z.string(), type: z.enum(['receita', 'despesa']) }),
  ),
  quality: z.object({
    input_rows: z.number(),
    output_rows: z.number(),
    rejected_rows: z.number(),
    duplicate_rows: z.number(),
    filled_optional_fields: z.number(),
  }),
  totals: metricsSchema,
  monthly: z.array(metricsSchema.extend({ month: z.string() })),
  transactions: z.array(transactionSchema),
})
export type Dataset = z.infer<typeof datasetSchema>

export function metrics(rows: Transaction[]) {
  let revenue = 0,
    expenses = 0,
    sales = 0
  for (const t of rows) {
    if (t.type === 'receita') {
      revenue += t.amount_cents
      sales++
    } else expenses += t.amount_cents
  }
  return {
    revenue_cents: revenue,
    expenses_cents: expenses,
    result_cents: revenue - expenses,
    margin: revenue ? (revenue - expenses) / revenue : null,
    ticket_cents: sales ? revenue / sales : null,
    sales,
  }
}
export function filterTransactions(rows: Transaction[], f: Filters) {
  return rows.filter(
    (t) =>
      t.date >= f.start && t.date <= f.end && (f.category === 'all' || t.category === f.category),
  )
}
const iso = (d: Date) => d.toISOString().slice(0, 10)
const utc = (s: string) => new Date(`${s}T00:00:00Z`)
export function previousPeriod(start: string, end: string) {
  const a = utc(start),
    b = utc(end)
  const monthEnd = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 0)).getUTCDate()
  if (a.getUTCDate() === 1 && b.getUTCDate() === monthEnd) {
    const months =
      (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() + 1
    return {
      start: iso(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - months, 1))),
      end: iso(new Date(a.getTime() - 86400000)),
    }
  }
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1
  return {
    start: iso(new Date(a.getTime() - days * 86400000)),
    end: iso(new Date(a.getTime() - 86400000)),
  }
}
export function monthlySeries(rows: Transaction[], start: string, end: string) {
  const buckets = new Map<string, Transaction[]>()
  const cursor = utc(start)
  cursor.setUTCDate(1)
  while (iso(cursor).slice(0, 7) <= end.slice(0, 7)) {
    buckets.set(iso(cursor).slice(0, 7), [])
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  for (const t of rows) buckets.get(t.date.slice(0, 7))?.push(t)
  return [...buckets].map(([month, data]) => ({ month, ...metrics(data) }))
}
export function change(current: number, previous: number): number | null {
  return previous === 0 ? null : (current - previous) / Math.abs(previous)
}
export function validateDataset(input: unknown): Dataset {
  const d = datasetSchema.parse(input)
  const ids = new Set<string>(),
    categories = new Map(d.categories.map((c) => [c.id, c.type]))
  for (const t of d.transactions) {
    const date = utc(t.date)
    if (
      Number.isNaN(date.getTime()) ||
      iso(date) !== t.date ||
      ids.has(t.id) ||
      categories.get(t.category) !== t.type ||
      t.date < d.start ||
      t.date > d.end
    )
      throw new Error('Transações inconsistentes no arquivo de dados.')
    ids.add(t.id)
  }
  const actual = metrics(d.transactions)
  for (const key of ['revenue_cents', 'expenses_cents', 'result_cents', 'sales'] as const) {
    if (actual[key] !== d.totals[key]) throw new Error('Os totais não conciliam com as transações.')
  }
  for (const key of ['margin', 'ticket_cents'] as const) {
    const a = actual[key],
      b = d.totals[key]
    if (a === null || b === null ? a !== b : Math.abs(a - b) > 1e-10)
      throw new Error('Indicadores totais inconsistentes.')
  }
  if (
    d.quality.output_rows !== d.transactions.length ||
    d.quality.input_rows !==
      d.quality.output_rows + d.quality.duplicate_rows + d.quality.rejected_rows
  )
    throw new Error('Relatório de qualidade inconsistente.')
  const monthly = monthlySeries(d.transactions, d.start, d.end)
  if (
    monthly.length !== d.monthly.length ||
    monthly.some((m, i) => {
      const other = d.monthly[i]
      return (Object.keys(m) as (keyof typeof m)[]).some((key) => {
        const a = m[key],
          b = other[key]
        return typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) > 1e-10 : a !== b
      })
    })
  )
    throw new Error('Agregações mensais inconsistentes.')
  return d
}
export const money = (cents: number | null) =>
  cents === null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
export const percent = (n: number | null) =>
  n === null
    ? '—'
    : new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      }).format(n)
export const number = (n: number) => new Intl.NumberFormat('pt-BR').format(n)
export const dateLabel = (date: string) =>
  utc(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
export const monthLabel = (month: string) =>
  utc(`${month}-01`)
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .replace('.', '')

export function csvContent(rows: Transaction[], categories: Dataset['categories']) {
  const labels = new Map(categories.map((c) => [c.id, c.label]))
  const quote = (v: string) =>
    `"${(/^[=+@\-\t\r\n]/.test(v) ? "'" : '') + v.replaceAll('"', '""')}"`
  const lines = rows.map((t) =>
    [
      t.id,
      t.date,
      t.type,
      labels.get(t.category) ?? t.category,
      (t.amount_cents / 100).toFixed(2).replace('.', ','),
      t.description,
      t.counterparty,
      'Sim',
    ]
      .map(quote)
      .join(';'),
  )
  return (
    '\uFEFF' +
    ['ID;Data;Tipo;Categoria;Valor BRL;Descrição;Contraparte;Dados fictícios', ...lines].join(
      '\r\n',
    )
  )
}
export function downloadCsv(rows: Transaction[], categories: Dataset['categories']) {
  const url = URL.createObjectURL(
    new Blob([csvContent(rows, categories)], { type: 'text/csv;charset=utf-8;' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = 'pulso-transacoes-ficticias.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
