import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  change,
  csvContent,
  filterTransactions,
  metrics,
  monthlySeries,
  previousPeriod,
  validateDataset,
} from './finance'
import type { Transaction } from './finance'

const rows: Transaction[] = [
  {
    id: '1',
    date: '2025-01-01',
    type: 'receita',
    category: 'loja',
    amount_cents: 10000,
    description: 'Venda',
    counterparty: 'Fictício',
  },
  {
    id: '2',
    date: '2025-01-31',
    type: 'receita',
    category: 'loja',
    amount_cents: 20000,
    description: 'Venda',
    counterparty: 'Fictício',
  },
  {
    id: '3',
    date: '2025-02-01',
    type: 'despesa',
    category: 'insumos',
    amount_cents: 6000,
    description: 'Compra',
    counterparty: 'Fictício',
  },
]
describe('indicadores e filtros', () => {
  it('calcula resultado, margem e ticket sobre transações', () => {
    expect(metrics(rows)).toEqual({
      revenue_cents: 30000,
      expenses_cents: 6000,
      result_cents: 24000,
      margin: 0.8,
      ticket_cents: 15000,
      sales: 2,
    })
  })
  it('inclui as datas limite e aplica a categoria', () => {
    expect(
      filterTransactions(rows, { start: '2025-01-01', end: '2025-01-31', category: 'loja' }),
    ).toHaveLength(2)
    expect(
      filterTransactions(rows, { start: '2025-01-01', end: '2025-02-01', category: 'insumos' }),
    ).toHaveLength(1)
  })
  it('não divide por zero nem calcula variação sem base', () => {
    expect(metrics([]).margin).toBeNull()
    expect(metrics([rows[2]]).ticket_cents).toBeNull()
    expect(change(100, 0)).toBeNull()
    expect(change(-50, -100)).toBe(0.5)
  })
  it('inclui meses sem transação e mantém somas conciliadas', () => {
    const series = monthlySeries(rows, '2025-01-01', '2025-03-31')
    expect(series).toHaveLength(3)
    expect(series[2].revenue_cents).toBe(0)
    expect(series.reduce((s, m) => s + m.result_cents, 0)).toBe(metrics(rows).result_cents)
  })
  it('compara meses completos e intervalos personalizados corretamente', () => {
    expect(previousPeriod('2025-07-01', '2025-12-31')).toEqual({
      start: '2025-01-01',
      end: '2025-06-30',
    })
    expect(previousPeriod('2024-03-01', '2024-03-31')).toEqual({
      start: '2024-02-01',
      end: '2024-02-29',
    })
    expect(previousPeriod('2025-01-10', '2025-01-19')).toEqual({
      start: '2024-12-31',
      end: '2025-01-09',
    })
  })
  it('exporta CSV com BOM, aspas escapadas e proteção contra fórmulas', () => {
    const csv = csvContent(
      [{ ...rows[0], description: '=SUM(1;2) "teste"' }],
      [{ id: 'loja', label: 'Loja física', type: 'receita' }],
    )
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"\'=SUM(1;2) ""teste"""')
    expect(csv).toContain('"100,00"')
    expect(csv).toContain('Dados fictícios')
  })
})
describe('contrato entre Python e dashboard', () => {
  const input = JSON.parse(readFileSync('public/data/dashboard.json', 'utf-8'))
  it('valida o arquivo real, os totais e todas as agregações mensais', () => {
    const data = validateDataset(input)
    expect(data.monthly).toHaveLength(24)
    expect(metrics(data.transactions)).toEqual(data.totals)
  })
  it('rejeita corrupção financeira e IDs duplicados', () => {
    const corrupted = structuredClone(input)
    corrupted.transactions[0].amount_cents += 1
    expect(() => validateDataset(corrupted)).toThrow()
    const duplicated = structuredClone(input)
    duplicated.transactions.push(duplicated.transactions[0])
    expect(() => validateDataset(duplicated)).toThrow()
  })
  it('rejeita base não identificada como fictícia', () => {
    expect(() => validateDataset({ ...input, fictional: false })).toThrow()
  })
})
