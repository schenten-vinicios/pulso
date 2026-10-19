import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { money, monthLabel, percent } from '../lib/finance'
import type { Dataset, monthlySeries, Transaction } from '../lib/finance'

type Series = ReturnType<typeof monthlySeries>
const palette = ['#234c40', '#7eaa79', '#bfd494', '#d3b67c', '#8ea9a7', '#d2dcd7']
const shortMoney = (v: number) =>
  `${(v / 100000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`
const tooltip = (value: unknown) => money(Number(value))

export function EvolutionChart({ data, result = false }: { data: Series; result?: boolean }) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={
        result
          ? 'Gráfico da evolução mensal do resultado. Valores disponíveis na tabela da análise.'
          : 'Gráfico de receitas e despesas por mês. Valores disponíveis na tabela da análise.'
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        {result ? (
          <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#edf0ec" />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              fontSize={11}
              minTickGap={18}
            />
            <YAxis
              tickFormatter={shortMoney}
              axisLine={false}
              tickLine={false}
              fontSize={11}
              width={56}
            />
            <Tooltip formatter={tooltip} labelFormatter={(v) => monthLabel(String(v))} />
            <ReferenceLine y={0} stroke="#acbbb3" />
            <Bar
              isAnimationActive={false}
              dataKey="result_cents"
              name="Resultado"
              radius={[4, 4, 0, 0]}
              maxBarSize={34}
            >
              {data.map((d) => (
                <Cell key={d.month} fill={d.result_cents >= 0 ? '#628f68' : '#c77860'} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#edf0ec" />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              minTickGap={18}
              fontSize={11}
            />
            <YAxis
              tickFormatter={shortMoney}
              axisLine={false}
              tickLine={false}
              fontSize={11}
              width={56}
            />
            <Tooltip formatter={tooltip} labelFormatter={(v) => monthLabel(String(v))} />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="revenue_cents"
              name="Receitas"
              stroke="#315e4d"
              strokeWidth={2.5}
              fill="#edf3e9"
              dot={{ r: 3, fill: '#315e4d', strokeWidth: 2, stroke: '#fff' }}
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="expenses_cents"
              name="Despesas"
              stroke="#b99c71"
              strokeWidth={2}
              fill="transparent"
              dot={{ r: 3, fill: '#b99c71', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
export function ExpensesChart({
  rows,
  categories,
}: {
  rows: Transaction[]
  categories: Dataset['categories']
}) {
  const values = categories
    .filter((c) => c.type === 'despesa')
    .map((c) => ({
      name: c.label,
      value: rows.filter((t) => t.category === c.id).reduce((sum, t) => sum + t.amount_cents, 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
  const total = values.reduce((s, c) => s + c.value, 0)
  if (!total) return <div className="empty compact">Nenhuma despesa no recorte selecionado.</div>
  return (
    <div className="expense-content">
      <div className="donut" role="img" aria-label="Participação das categorias nas despesas">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={values}
              dataKey="value"
              innerRadius="70%"
              outerRadius="92%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              stroke="none"
            >
              {values.map((v, i) => (
                <Cell key={v.name} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-label">
          <span>Despesas</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
      <div className="category-legend">
        {values.map((v, i) => (
          <div key={v.name}>
            <span className="legend-dot" style={{ background: palette[i % palette.length] }} />
            <span>{v.name}</span>
            <strong>{percent(v.value / total)}</strong>
            <small>{money(v.value)}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
export function ComparisonChart({
  current,
  previous,
}: {
  current: ReturnType<typeof import('../lib/finance').metrics>
  previous: ReturnType<typeof import('../lib/finance').metrics>
}) {
  const data = [
    { name: 'Receita', atual: current.revenue_cents, anterior: previous.revenue_cents },
    { name: 'Despesas', atual: current.expenses_cents, anterior: previous.expenses_cents },
    { name: 'Resultado', atual: current.result_cents, anterior: previous.result_cents },
  ]
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="#edf0ec" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
          <YAxis
            tickFormatter={shortMoney}
            axisLine={false}
            tickLine={false}
            width={56}
            fontSize={11}
          />
          <Tooltip formatter={tooltip} />
          <Legend />
          <Bar
            isAnimationActive={false}
            dataKey="anterior"
            name="Anterior"
            fill="#d4dfd1"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
          <Bar
            isAnimationActive={false}
            dataKey="atual"
            name="Atual"
            fill="#315e4d"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
