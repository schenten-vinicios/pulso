import { BarChart3, CalendarDays, Info, Table2 } from 'lucide-react'
import type { Dataset } from '../lib/finance'

const definitions = [
  ['Receita total', 'Total recebido pelas vendas no período.'],
  ['Despesas totais', 'Gastos pagos e registrados no período.'],
  [
    'Resultado financeiro',
    'Diferença entre receitas e despesas do período. Não equivale ao lucro contábil.',
  ],
  ['Margem de resultado', 'Percentual da receita que permanece como resultado após as despesas.'],
  ['Ticket médio', 'Receita média por venda. Cada transação de receita representa uma venda.'],
  [
    'Variação entre períodos',
    'Mudança em relação ao período comparado, em percentual; para a margem, em pontos percentuais.',
  ],
]

export default function AboutPanel({ data }: { data: Pick<Dataset, 'start' | 'end'> }) {
  return (
    <div className="about-panel panel">
      <section aria-labelledby="about-indicators-title">
        <h2 id="about-indicators-title">Indicadores financeiros</h2>
        <dl className="about-indicators">
          {definitions.map(([name, definition]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{definition}</dd>
            </div>
          ))}
        </dl>
        <p className="about-calculation-note">
          “—” indica que não há base para o cálculo ou para a comparação.
        </p>
      </section>

      <section className="about-guide" aria-labelledby="about-guide-title">
        <h2 id="about-guide-title">Como explorar os dados</h2>
        <ul>
          <li>
            <CalendarDays size={18} aria-hidden="true" />
            <div>
              <h3>Selecione um período</h3>
              <p>
                Escolha as datas e a categoria. Os indicadores consideram esse recorte, incluindo os
                dias inicial e final.
              </p>
            </div>
          </li>
          <li>
            <BarChart3 size={18} aria-hidden="true" />
            <div>
              <h3>Compare resultados</h3>
              <p>
                Compare com o período anterior ou com o mesmo período do ano anterior, sempre na
                mesma categoria.
              </p>
            </div>
          </li>
          <li>
            <Table2 size={18} aria-hidden="true" />
            <div>
              <h3>Explore os lançamentos</h3>
              <p>
                Consulte os registros em Transações. “Exportar CSV” baixa o recorte global;
                “Exportar tabela” considera também a busca e o tipo selecionados.
              </p>
            </div>
          </li>
        </ul>
      </section>

      <aside className="about-data" aria-labelledby="about-data-title">
        <Info size={17} aria-hidden="true" />
        <div>
          <h2 id="about-data-title">Sobre os dados</h2>
          <p>
            Demonstração com dados fictícios de uma cafeteria e empório, de {data.start.slice(0, 4)}
            {' a '}
            {data.end.slice(0, 4)}. Não representa informações financeiras reais.
          </p>
        </div>
      </aside>
    </div>
  )
}
