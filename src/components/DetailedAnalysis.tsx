import { change, dateLabel, money, monthLabel, number, percent } from '../lib/finance'
import type { Filters, metrics, monthlySeries } from '../lib/finance'
import { ComparisonChart } from './Charts'

type Metrics = ReturnType<typeof metrics>
type Comparison = { start: string; end: string; covered: boolean; metrics: Metrics }

export default function DetailedAnalysis({
  current,
  previous,
  monthly,
  filters,
}: {
  current: Metrics
  previous: Comparison | null
  monthly: ReturnType<typeof monthlySeries>
  filters: Filters
}) {
  const indicators = [
    { label: 'Receita total', key: 'revenue_cents', format: money },
    { label: 'Despesas totais', key: 'expenses_cents', format: money, inverse: true },
    { label: 'Resultado financeiro', key: 'result_cents', format: money },
    { label: 'Margem de resultado', key: 'margin', format: percent },
    { label: 'Ticket médio', key: 'ticket_cents', format: money },
  ] as const
  const periodLegend = (
    <div className="comparison-periods">
      <span>
        <i className="period-dot current" />
        <strong>Atual</strong> {dateLabel(filters.start)} — {dateLabel(filters.end)}
      </span>
      {previous && (
        <span>
          <i className="period-dot previous" />
          <strong>Anterior</strong> {dateLabel(previous.start)} — {dateLabel(previous.end)}
        </span>
      )}
    </div>
  )

  return (
    <div className="detailed-analysis">
      <div className={`comparison-layout${previous?.covered ? '' : ' comparison-layout-single'}`}>
        <section className="panel comparison-panel" aria-labelledby="comparison-title">
          <div className="panel-heading">
            <div>
              <h2 id="comparison-title">Comparação entre períodos</h2>
              <p>Receitas, despesas e resultado no período.</p>
            </div>
            <span className="unit-tag">ATUAL × ANTERIOR</span>
          </div>
          <div className="comparison-chart-group">
            {periodLegend}
            {previous?.covered ? (
              <ComparisonChart current={current} previous={previous.metrics} />
            ) : (
              <div className="empty">
                O período de comparação ultrapassa a cobertura dos dados. Escolha outro período ou
                confira o detalhamento mensal abaixo.
              </div>
            )}
          </div>
        </section>
        {previous?.covered && (
          <section
            className="panel comparison-indicators"
            aria-labelledby="period-indicators-title"
          >
            <div className="panel-heading">
              <div>
                <h2 id="period-indicators-title">Indicadores por período</h2>
                <p>Confira os valores atuais, anteriores e suas variações.</p>
              </div>
            </div>
            <div className="table-scroll comparison-table">
              <table aria-label="Indicadores por período">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th className="numeric">Atual</th>
                    <th className="numeric">Anterior</th>
                    <th className="numeric">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {indicators.map((indicator) => {
                    const actual = current[indicator.key],
                      before = previous.metrics[indicator.key]
                    const delta =
                      actual === null || before === null
                        ? null
                        : indicator.key === 'margin'
                          ? actual - before
                          : change(actual, before)
                    const favorable =
                      delta !== null && ('inverse' in indicator ? delta <= 0 : delta >= 0)
                    const deltaLabel =
                      delta === null
                        ? '—'
                        : `${delta > 0 ? '+' : ''}${indicator.key === 'margin' ? `${number(Math.round(delta * 1000) / 10)} p.p.` : percent(delta)}`
                    return (
                      <tr key={indicator.key}>
                        <th scope="row">{indicator.label}</th>
                        <td className="numeric amount">{indicator.format(actual)}</td>
                        <td className="numeric muted">{indicator.format(before)}</td>
                        <td className="numeric">
                          <span
                            className={`analysis-variation ${delta === null || delta === 0 ? '' : favorable ? 'good' : 'bad'}`}
                          >
                            {deltaLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="comparison-footnote">
                Variações sem base de cálculo aparecem como “—”. Margem em pontos percentuais.
              </p>
            </div>
          </section>
        )}
      </div>
      <section className="panel" aria-labelledby="monthly-title">
        <div className="panel-heading">
          <div>
            <h2 id="monthly-title">Resultado mensal em detalhe</h2>
            <p>Confira a composição do resultado em cada mês do recorte selecionado.</p>
          </div>
          <span className="unit-tag">MÊS A MÊS</span>
        </div>
        <div className="table-scroll monthly-details">
          <table aria-label="Indicadores mensais">
            <thead>
              <tr>
                <th>Mês</th>
                <th className="numeric">Receitas</th>
                <th className="numeric">Despesas</th>
                <th className="numeric">Resultado</th>
                <th className="numeric">Margem</th>
                <th className="numeric">Vendas</th>
                <th className="numeric">Ticket médio</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td>{monthLabel(m.month)}</td>
                  <td className="numeric">{money(m.revenue_cents)}</td>
                  <td className="numeric">{money(m.expenses_cents)}</td>
                  <td className="numeric amount">{money(m.result_cents)}</td>
                  <td className="numeric">{percent(m.margin)}</td>
                  <td className="numeric">{number(m.sales)}</td>
                  <td className="numeric">{money(m.ticket_cents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total do recorte</th>
                <td className="numeric">{money(current.revenue_cents)}</td>
                <td className="numeric">{money(current.expenses_cents)}</td>
                <td className="numeric">{money(current.result_cents)}</td>
                <td className="numeric">{percent(current.margin)}</td>
                <td className="numeric">{number(current.sales)}</td>
                <td className="numeric">{money(current.ticket_cents)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}
