import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  FileText,
  LayoutDashboard,
  Leaf,
  Menu,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import {
  change,
  dateLabel,
  downloadCsv,
  filterTransactions,
  metrics,
  money,
  monthlySeries,
  number,
  percent,
  previousPeriod,
  validateDataset,
  monthLabel,
} from './lib/finance'
import type { Dataset, Filters } from './lib/finance'
import { EvolutionChart, ExpensesChart } from './components/Charts'
import DetailedAnalysis from './components/DetailedAnalysis'
import Transactions from './components/Transactions'
import AboutPanel from './components/Methodology'

type Page = 'overview' | 'analysis' | 'transactions' | 'methodology'
const pages = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'analysis', label: 'Análise detalhada', icon: BarChart3 },
  { id: 'transactions', label: 'Transações', icon: FileText },
  { id: 'methodology', label: 'Sobre o painel', icon: BookOpen },
] as const
const initial: Filters = { start: '2025-07-01', end: '2025-12-31', category: 'all' }
const titles: Record<Page, [string, string]> = {
  overview: [
    'O seu negócio, em perspectiva.',
    'Acompanhe os números. Encontre oportunidades. Tome decisões.',
  ],
  analysis: [
    'Entenda o que mudou no resultado.',
    'Compare períodos, identifique variações e confira os resultados mês a mês.',
  ],
  transactions: [
    'Cada lançamento conta uma história.',
    'Explore os registros que dão origem aos seus indicadores.',
  ],
  methodology: [
    'Entenda seus indicadores.',
    'Saiba o que cada informação representa e como acompanhar o desempenho financeiro do negócio.',
  ],
}
function pageFromHash(): Page {
  const p = location.hash.slice(1)
  return pages.some((x) => x.id === p) ? (p as Page) : 'overview'
}
function yearBefore(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return `${y - 1}-${String(m).padStart(2, '0')}-${String(Math.min(d, new Date(Date.UTC(y - 1, m, 0)).getUTCDate())).padStart(2, '0')}`
}

function Kpi({
  label,
  value,
  delta,
  inverse = false,
  note,
  icon: Icon,
}: {
  label: string
  value: string
  delta: number | null
  inverse?: boolean
  note?: string
  icon: typeof Wallet
}) {
  const positive = delta !== null && (inverse ? delta <= 0 : delta >= 0)
  return (
    <article className="kpi">
      <div className="kpi-label">
        {label}
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <div className="kpi-bottom">
        {delta === null ? (
          <span className="muted">Sem base comparável</span>
        ) : (
          <span className={`delta ${positive ? 'good' : 'bad'}`}>
            {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {note
              ? `${(delta * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`
              : percent(Math.abs(delta))}
          </span>
        )}
        <span>{delta !== null ? (note ? 'de margem' : 'vs. comparação') : ''}</span>
      </div>
    </article>
  )
}
function App() {
  const [data, setData] = useState<Dataset | null>(null),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState<Page>(pageFromHash),
    [mobileOpen, setMobileOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(initial),
    [preset, setPreset] = useState('semester'),
    [comparison, setComparison] = useState('previous')
  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timeout = setTimeout(() => controller.abort(), 20000)
    setError('')
    fetch('/data/dashboard.json', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar dados (${r.status}).`)
        return r.json()
      })
      .then(validateDataset)
      .then((d) => {
        if (active) setData(d)
      })
      .catch(() => {
        if (active)
          setError(
            'Não foi possível carregar e validar os dados. Verifique a conexão e tente novamente.',
          )
      })
      .finally(() => clearTimeout(timeout))
    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [attempt])
  const validRange =
    !!data &&
    !!filters.start &&
    !!filters.end &&
    filters.start <= filters.end &&
    filters.start >= data.start &&
    filters.end <= data.end
  const currentRows = useMemo(
    () => (data && validRange ? filterTransactions(data.transactions, filters) : []),
    [data, filters, validRange],
  )
  const current = useMemo(() => metrics(currentRows), [currentRows])
  const previous = useMemo(() => {
    if (!data || !validRange) return null
    const range =
      comparison === 'year'
        ? { start: yearBefore(filters.start), end: yearBefore(filters.end) }
        : previousPeriod(filters.start, filters.end)
    const covered = range.start >= data.start && range.end <= data.end
    return {
      ...range,
      covered,
      metrics: metrics(
        filterTransactions(data.transactions, { ...range, category: filters.category }),
      ),
    }
  }, [data, validRange, filters, comparison])
  const monthly = useMemo(
    () => (validRange ? monthlySeries(currentRows, filters.start, filters.end) : []),
    [validRange, currentRows, filters],
  )
  function navigate(p: Page) {
    setPage(p)
    location.hash = p
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function choosePreset(value: string) {
    setPreset(value)
    const ranges: Record<string, [string, string]> = {
      semester: ['2025-07-01', '2025-12-31'],
      quarter: ['2025-10-01', '2025-12-31'],
      year: ['2025-01-01', '2025-12-31'],
      all: ['2024-01-01', '2025-12-31'],
    }
    if (ranges[value]) setFilters((f) => ({ ...f, start: ranges[value][0], end: ranges[value][1] }))
  }
  const revenueDelta = previous?.covered
    ? change(current.revenue_cents, previous.metrics.revenue_cents)
    : null
  const best = monthly.length
    ? monthly.reduce((a, b) => (b.result_cents > a.result_cents ? b : a))
    : null
  const largestExpense = data?.categories
    .filter((c) => c.type === 'despesa')
    .map((c) => ({
      ...c,
      value: currentRows.filter((t) => t.category === c.id).reduce((s, t) => s + t.amount_cents, 0),
    }))
    .sort((a, b) => b.value - a.value)[0]
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Ir para o conteúdo
      </a>
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <a className="brand" href="#overview" onClick={() => navigate('overview')}>
          <span className="brand-mark">
            <Activity size={25} />
          </span>
          pulso<span className="brand-period">.</span>
        </a>
        <div className="workspace">
          <span className="business-icon">
            <Leaf size={19} />
          </span>
          <div>
            <strong>Casa Grão</strong>
            <span>Cafeteria & empório</span>
          </div>
          <span className="workspace-demo">DEMO</span>
        </div>
        <span className="nav-label">ESPAÇO DE ANÁLISE</span>
        <nav aria-label="Navegação principal">
          {pages.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              aria-current={page === p.id ? 'page' : undefined}
              className={page === p.id ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault()
                navigate(p.id)
              }}
            >
              <p.icon size={18} />
              {p.label}
              {page === p.id && <span className="active-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {page !== 'methodology' && (
            <div className="sidebar-tip">
              <span className="tiny-icon">
                <Activity size={16} />
              </span>
              <h3>Dados que fazem sentido.</h3>
              <p>Uma demonstração de como transformar operações em decisões de negócio.</p>
              <button onClick={() => navigate('methodology')}>
                Sobre o painel <ArrowRight size={15} />
              </button>
            </div>
          )}
          <div className="sidebar-footer">
            <span className="status-dot" /> Ambiente demonstrativo
            <small>Dados fictícios · Sem conexão bancária</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label={mobileOpen ? 'Fechar navegação' : 'Abrir navegação'}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{pages.find((p) => p.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-pill">
              <span /> Dados fictícios
            </span>
            <button
              className="icon-button"
              aria-label="Como funciona o Pulso"
              onClick={() => navigate('methodology')}
            >
              <CircleHelp size={19} />
            </button>
            <span className="avatar" aria-label="Empresa fictícia Casa Grão">
              CG
            </span>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === 'analysis'
                  ? 'ANÁLISE COMPARATIVA'
                  : page === 'methodology'
                    ? 'SOBRE O PAINEL'
                    : 'INTELIGÊNCIA FINANCEIRA & COMERCIAL'}
              </div>
              <h1>{titles[page][0]}</h1>
              <p>{titles[page][1]}</p>
            </div>
            {page !== 'methodology' && (
              <button
                className="button primary"
                disabled={!currentRows.length}
                onClick={() => data && downloadCsv(currentRows, data.categories)}
              >
                <Download size={16} /> Exportar CSV
              </button>
            )}
          </div>
          {!data && !error && (
            <div className="loading" role="status">
              <RefreshCw className="spin" size={24} />
              <h2>Preparando sua visão de negócio</h2>
              <p>Carregando e validando a base demonstrativa…</p>
              <div className="skeleton-row">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          {error && (
            <div role="alert" className="error-state">
              <h2>Não conseguimos abrir os dados</h2>
              <p>{error}</p>
              <button className="button primary" onClick={() => setAttempt((a) => a + 1)}>
                <RefreshCw size={16} /> Tentar novamente
              </button>
            </div>
          )}
          {data && page === 'methodology' && <AboutPanel data={data} />}
          {data && page !== 'methodology' && (
            <>
              <section className="filters" aria-label="Filtros do dashboard">
                <div className="filter-icon">
                  <SlidersHorizontal size={18} />
                </div>
                <label>
                  Período
                  <select
                    aria-label="Período"
                    value={preset}
                    onChange={(e) => choosePreset(e.target.value)}
                  >
                    <option value="semester">2º semestre de 2025</option>
                    <option value="quarter">4º trimestre de 2025</option>
                    <option value="year">Ano de 2025</option>
                    <option value="all">Toda a base · 24 meses</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </label>
                <div className="date-range">
                  <label>
                    De
                    <input
                      aria-label="Data inicial"
                      type="date"
                      min={data.start}
                      max={data.end}
                      value={filters.start}
                      onChange={(e) => {
                        setFilters((f) => ({ ...f, start: e.target.value }))
                        setPreset('custom')
                      }}
                    />
                  </label>
                  <span>→</span>
                  <label>
                    Até
                    <input
                      aria-label="Data final"
                      type="date"
                      min={data.start}
                      max={data.end}
                      value={filters.end}
                      onChange={(e) => {
                        setFilters((f) => ({ ...f, end: e.target.value }))
                        setPreset('custom')
                      }}
                    />
                  </label>
                </div>
                <label>
                  Categoria
                  <select
                    aria-label="Categoria"
                    value={filters.category}
                    onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="all">Todas as categorias</option>
                    <optgroup label="Receitas">
                      {data.categories
                        .filter((c) => c.type === 'receita')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Despesas">
                      {data.categories
                        .filter((c) => c.type === 'despesa')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </label>
                <button
                  className="reset-button"
                  onClick={() => {
                    setFilters(initial)
                    setPreset('semester')
                    setComparison('previous')
                  }}
                >
                  <RefreshCw size={13} /> Limpar
                </button>
              </section>
              {!validRange ? (
                <div className="error-state" role="alert">
                  <h2>Selecione um período válido</h2>
                  <p>
                    Use datas entre {dateLabel(data.start)} e {dateLabel(data.end)}, com a data
                    final igual ou posterior à inicial.
                  </p>
                </div>
              ) : (
                <>
                  <div className="comparison-line">
                    <span>
                      <CalendarDays size={14} /> {dateLabel(filters.start)} —{' '}
                      {dateLabel(filters.end)}
                    </span>
                    <label>
                      Comparar com{' '}
                      <select
                        aria-label="Comparação"
                        value={comparison}
                        onChange={(e) => setComparison(e.target.value)}
                      >
                        <option value="previous">período anterior</option>
                        <option value="year">mesmo período do ano anterior</option>
                      </select>
                      <ChevronDown size={12} />
                    </label>
                  </div>
                  {previous && (
                    <p className={`comparison-note ${previous.covered ? '' : 'unavailable'}`}>
                      {previous.covered
                        ? 'Base de comparação:'
                        : 'Comparação indisponível: a base não cobre integralmente'}{' '}
                      {dateLabel(previous.start)} a {dateLabel(previous.end)}. Mesma categoria
                      aplicada.
                    </p>
                  )}
                  {page === 'overview' && (
                    <>
                      <section className="kpi-grid" aria-label="Indicadores financeiros">
                        <Kpi
                          label="Receita total"
                          value={money(current.revenue_cents)}
                          delta={revenueDelta}
                          icon={ArrowUpRight}
                        />
                        <Kpi
                          label="Despesas totais"
                          value={money(current.expenses_cents)}
                          delta={
                            previous?.covered
                              ? change(current.expenses_cents, previous.metrics.expenses_cents)
                              : null
                          }
                          inverse
                          icon={ArrowDownLeft}
                        />
                        <Kpi
                          label="Resultado financeiro"
                          value={money(current.result_cents)}
                          delta={
                            previous?.covered
                              ? change(current.result_cents, previous.metrics.result_cents)
                              : null
                          }
                          icon={Wallet}
                        />
                        <Kpi
                          label="Margem de resultado"
                          value={percent(current.margin)}
                          delta={
                            previous?.covered &&
                            current.margin !== null &&
                            previous.metrics.margin !== null
                              ? current.margin - previous.metrics.margin
                              : null
                          }
                          note="pp"
                          icon={TrendingUp}
                        />
                        <Kpi
                          label="Ticket médio"
                          value={money(current.ticket_cents)}
                          delta={
                            previous?.covered &&
                            current.ticket_cents !== null &&
                            previous.metrics.ticket_cents !== null
                              ? change(current.ticket_cents, previous.metrics.ticket_cents)
                              : null
                          }
                          icon={BarChart3}
                        />
                      </section>
                      {!currentRows.length && (
                        <div className="notice" role="status">
                          Nenhuma transação neste período e categoria. Os gráficos e indicadores
                          refletem o recorte vazio.
                        </div>
                      )}
                      <div className="chart-grid main-charts">
                        <section className="panel">
                          <div className="panel-heading">
                            <div>
                              <h2>Receitas e despesas</h2>
                              <p>A evolução do seu negócio, mês a mês</p>
                            </div>
                            <span className="unit-tag">EM R$</span>
                          </div>
                          <div className="inline-legend">
                            <span>
                              <i style={{ background: '#315e4d' }} />
                              Receitas
                            </span>
                            <span>
                              <i style={{ background: '#b99c71' }} />
                              Despesas
                            </span>
                          </div>
                          <EvolutionChart data={monthly} />
                        </section>
                        <section className="panel">
                          <div className="panel-heading">
                            <div>
                              <h2>Para onde vai o dinheiro?</h2>
                              <p>Distribuição das despesas por categoria</p>
                            </div>
                          </div>
                          <ExpensesChart rows={currentRows} categories={data.categories} />
                        </section>
                      </div>
                      <div className="chart-grid bottom-charts">
                        <section className="panel">
                          <div className="panel-heading">
                            <div>
                              <h2>Evolução do resultado</h2>
                              <p>Receitas menos despesas em cada mês</p>
                            </div>
                            <span className="unit-tag">EM R$</span>
                          </div>
                          <EvolutionChart data={monthly} result />
                        </section>
                        <section className="insight-panel">
                          <div className="eyebrow">
                            <Activity size={15} /> LEITURA DO PERÍODO
                          </div>
                          <h2>Os números contam.</h2>
                          <p className="insight-intro">
                            Alguns pontos para orientar a sua análise.
                          </p>
                          <div className="insight-item">
                            <span>01</span>
                            <div>
                              <h3>
                                {current.result_cents >= 0
                                  ? 'Operação com saldo positivo'
                                  : 'Saídas acima das entradas'}
                              </h3>
                              <p>
                                {current.margin !== null
                                  ? `O resultado representa ${percent(current.margin)} da receita no recorte selecionado.`
                                  : 'Não há receita neste recorte para calcular a margem.'}
                              </p>
                            </div>
                          </div>
                          <div className="insight-item">
                            <span>02</span>
                            <div>
                              <h3>
                                {largestExpense?.value
                                  ? `${largestExpense.label} lidera as despesas`
                                  : 'Sem despesas no recorte'}
                              </h3>
                              <p>
                                {largestExpense?.value
                                  ? `${percent(largestExpense.value / current.expenses_cents)} das saídas estão nessa categoria. Explore os lançamentos para entender a composição.`
                                  : 'Selecione todas as categorias para analisar a composição das saídas.'}
                              </p>
                            </div>
                          </div>
                          <div className="insight-item">
                            <span>03</span>
                            <div>
                              <h3>
                                {best && currentRows.length
                                  ? `Melhor resultado: ${monthLabel(best.month)}`
                                  : 'Sem resultado mensal disponível'}
                              </h3>
                              <p>
                                {best && currentRows.length
                                  ? `${money(best.result_cents)} de resultado. Meses parciais refletem somente os dias selecionados.`
                                  : 'Amplie o período para explorar as transações.'}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => navigate('analysis')}>
                            Explorar análise detalhada <ArrowRight size={16} />
                          </button>
                        </section>
                      </div>
                    </>
                  )}
                  {page === 'analysis' && (
                    <DetailedAnalysis
                      current={current}
                      previous={previous}
                      monthly={monthly}
                      filters={filters}
                    />
                  )}
                  {page === 'transactions' && (
                    <Transactions
                      key={`${filters.start}:${filters.end}:${filters.category}`}
                      rows={currentRows}
                      categories={data.categories}
                    />
                  )}
                  {page === 'overview' && (
                    <div className="explore-strip">
                      <div>
                        <FileText size={20} />
                        <span>
                          <strong>Quer chegar à origem dos números?</strong>
                          <small>
                            Explore as {number(currentRows.length)} transações deste período.
                          </small>
                        </span>
                      </div>
                      <button onClick={() => navigate('transactions')}>
                        Ver transações <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Check size={13} /> Dados fictícios para demonstração profissional
            </span>
            <span>Pulso · BI, Dados & Automação</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
export default App
