import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { filterTransactions, metrics, money, percent } from '../src/lib/finance'
import type { Dataset } from '../src/lib/finance'

const dataset: Dataset = JSON.parse(readFileSync('public/data/dashboard.json', 'utf-8'))
test('indicadores reais, filtros, comparação e navegação', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.locator('.kpi').first()).toBeVisible()
  const filtered = filterTransactions(dataset.transactions, {
    start: '2025-07-01',
    end: '2025-12-31',
    category: 'all',
  })
  const kpi = metrics(filtered)
  await expect(page.locator('.kpi').nth(0)).toContainText(money(kpi.revenue_cents))
  await expect(page.locator('.kpi').nth(3)).toContainText(percent(kpi.margin))
  await page.getByLabel('Categoria', { exact: true }).selectOption('pessoal')
  await expect(page.locator('.kpi').nth(0)).toContainText('R$ 0,00')
  await expect(page.locator('.kpi').nth(1)).toContainText(
    money(metrics(filtered.filter((t) => t.category === 'pessoal')).expenses_cents),
  )
  await expect(page.locator('.kpi').nth(3).locator('strong')).toHaveText('—')
  await page.getByLabel('Período', { exact: true }).selectOption('all')
  await expect(page.getByText('Comparação indisponível:', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Limpar', exact: true }).click()
  await page.getByLabel('Comparação', { exact: true }).selectOption('year')
  await expect(page.locator('.comparison-note')).toContainText('01/07/2024')
  await page.getByLabel('Data inicial', { exact: true }).fill('2025-12-31')
  await page.getByLabel('Data final', { exact: true }).fill('2025-01-01')
  await expect(page.getByRole('alert')).toContainText('Selecione um período válido')
  await page.getByRole('button', { name: 'Limpar', exact: true }).click()
  await page.getByRole('button', { name: 'Explorar análise detalhada' }).click()
  await expect(page.locator('.kpi-grid')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Comparação entre períodos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Resultado mensal em detalhe' })).toBeVisible()
  await expect(page.locator('tfoot')).toContainText(money(kpi.revenue_cents))
  await page.screenshot({ path: `test-results/analysis-${info.project.name}.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('menu distingue visão geral da análise e mantém os filtros', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.locator('.kpi-grid')).toBeVisible()
  await expect(page.locator('.detailed-analysis')).toHaveCount(0)
  await page.getByLabel('Período', { exact: true }).selectOption('quarter')
  await page.getByLabel('Categoria', { exact: true }).selectOption('online')
  await page.getByLabel('Comparação', { exact: true }).selectOption('year')
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Abrir navegação' }).click()
  await page.getByRole('link', { name: 'Análise detalhada', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Entenda o que mudou no resultado.' }),
  ).toBeVisible()
  await expect(page.locator('.kpi-grid')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Receitas e despesas', exact: true })).toHaveCount(
    0,
  )
  const firstPanel = page.locator('main .panel').first()
  await expect(firstPanel.getByRole('heading', { name: 'Comparação entre períodos' })).toBeVisible()
  if (info.project.name === 'desktop') await expect(firstPanel.locator('h2')).toBeInViewport()
  await expect(page.getByLabel('Período', { exact: true })).toHaveValue('quarter')
  await expect(page.getByLabel('Categoria', { exact: true })).toHaveValue('online')
  await expect(page.getByLabel('Comparação', { exact: true })).toHaveValue('year')
  const expected = metrics(
    filterTransactions(dataset.transactions, {
      start: '2025-10-01',
      end: '2025-12-31',
      category: 'online',
    }),
  )
  const compared = metrics(
    filterTransactions(dataset.transactions, {
      start: '2024-10-01',
      end: '2024-12-31',
      category: 'online',
    }),
  )
  const revenue = page
    .getByRole('table', { name: 'Indicadores por período' })
    .getByRole('row')
    .nth(1)
  await expect(revenue).toContainText(money(expected.revenue_cents))
  await expect(revenue).toContainText(money(compared.revenue_cents))
  await expect(page.locator('tfoot')).toContainText(money(expected.revenue_cents))
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await page.getByLabel('Período', { exact: true }).selectOption('all')
  await expect(page.getByText('O período de comparação ultrapassa', { exact: false })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Indicadores mensais' })).toBeVisible()
})

test('tabela, busca, detalhes e exportação de todos os resultados', async ({ page }, info) => {
  await page.goto('/#transactions')
  await expect(page.locator('tbody tr')).toHaveCount(12)
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.locator('.pagination')).toContainText('Página 2')
  const fullDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar tabela' }).click()
  const fullDownload = await fullDownloadPromise
  const fullPath = `test-results/full-export-${info.project.name}.csv`
  await fullDownload.saveAs(fullPath)
  const expectedCount = filterTransactions(dataset.transactions, {
    start: '2025-07-01',
    end: '2025-12-31',
    category: 'all',
  }).length
  expect(readFileSync(fullPath, 'utf-8').split('\r\n')).toHaveLength(expectedCount + 1)
  await page.getByLabel('Tipo de transação').selectOption('despesa')
  await page.getByLabel('Buscar transações').fill('Folha')
  await expect(page.locator('tbody tr')).toHaveCount(6)
  await page
    .getByRole('button', { name: /Detalhes de TX/ })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('Transação fictícia')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar tabela' }).click()
  const download = await downloadPromise
  const path = `test-results/export-${info.project.name}.csv`
  await download.saveAs(path)
  const csv = readFileSync(path, 'utf-8')
  expect(csv.split('\r\n')).toHaveLength(7)
  expect(csv).toContain('Folha e encargos')
  await page.getByLabel('Buscar transações').fill('nada-encontrado-xyz')
  await expect(page.getByText('Nenhuma transação encontrada')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Exportar tabela' })).toBeDisabled()
  await page.getByLabel('Buscar transações').fill('')
  await page.getByRole('button', { name: 'Valor', exact: true }).click()
  await expect(page.getByRole('columnheader', { name: 'Valor' })).toHaveAttribute(
    'aria-sort',
    'descending',
  )
  await page.screenshot({
    path: `test-results/transactions-${info.project.name}.png`,
    fullPage: true,
  })
})

test('responsividade, menu e sobre o painel', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.locator('.kpi')).toHaveCount(5)
  await expect(page.locator('.recharts-area-curve').first()).toBeVisible()
  await expect(page.locator('.recharts-pie-sector').first()).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await page.screenshot({ path: `test-results/overview-${info.project.name}.png`, fullPage: true })
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Abrir navegação' }).click()
  await page.getByRole('link', { name: 'Sobre o painel', exact: true }).click()
  await expect(page).toHaveURL(/#methodology$/)
  await expect(page.getByRole('heading', { name: 'Entenda seus indicadores.' })).toBeVisible()
  const indicators = page.getByRole('region', { name: 'Indicadores financeiros' })
  await expect(indicators.getByRole('term')).toHaveText([
    'Receita total',
    'Despesas totais',
    'Resultado financeiro',
    'Margem de resultado',
    'Ticket médio',
    'Variação entre períodos',
  ])
  await expect(page.getByRole('heading', { name: 'Sobre os dados' })).toBeVisible()
  await expect(page.locator('.sidebar-tip')).toHaveCount(0)
  await expect(page.getByText('Um fluxo reproduzível', { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Entenda seus indicadores.' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await page.screenshot({ path: `test-results/about-${info.project.name}.png`, fullPage: true })
  if (info.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Como funciona o Pulso' }).click()
    await expect(page.getByRole('heading', { name: 'Entenda seus indicadores.' })).toBeVisible()
  }
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Abrir navegação' }).click()
  await page.getByRole('link', { name: 'Visão geral', exact: true }).click()
  await expect(page.locator('.kpi')).toHaveCount(5)
  await expect(page.locator('.sidebar-tip')).toHaveCount(1)
})

test('falha de dados com recuperação e estado de carregamento', async ({ page }) => {
  let fail = true
  await page.route('**/data/dashboard.json', async (route) => {
    if (fail) await route.fulfill({ status: 500, body: 'indisponível' })
    else await route.continue()
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Não conseguimos abrir os dados')
  fail = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.locator('.kpi')).toHaveCount(5)
})
