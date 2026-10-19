import { useEffect, useRef, useState } from 'react'
import { ArrowDownUp, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react'
import { dateLabel, downloadCsv, money, number } from '../lib/finance'
import type { Dataset, Transaction } from '../lib/finance'

export default function Transactions({
  rows,
  categories,
}: {
  rows: Transaction[]
  categories: Dataset['categories']
}) {
  const [search, setSearch] = useState(''),
    [type, setType] = useState('all'),
    [page, setPage] = useState(1)
  const [sort, setSort] = useState<'date' | 'amount_cents'>('date'),
    [descending, setDescending] = useState(true)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const labels = new Map(categories.map((c) => [c.id, c.label]))
  const matching = rows
    .filter(
      (t) =>
        (type === 'all' || t.type === type) &&
        `${t.id} ${t.description} ${t.counterparty} ${labels.get(t.category)}`
          .toLocaleLowerCase('pt-BR')
          .includes(search.toLocaleLowerCase('pt-BR')),
    )
    .sort(
      (a, b) =>
        (sort === 'date' ? a.date.localeCompare(b.date) : a.amount_cents - b.amount_cents) *
        (descending ? -1 : 1),
    )
  const pages = Math.max(1, Math.ceil(matching.length / 12)),
    currentPage = Math.min(page, pages)
  const visible = matching.slice((currentPage - 1) * 12, currentPage * 12)
  useEffect(() => {
    if (selected) dialog.current?.showModal()
    else dialog.current?.close()
  }, [selected])
  function toggleSort(key: typeof sort) {
    setDescending(sort === key ? !descending : true)
    setSort(key)
    setPage(1)
  }
  return (
    <section className="panel transaction-panel">
      <div className="panel-heading">
        <div>
          <h2>Transações</h2>
          <p>{number(matching.length)} registros no recorte atual</p>
        </div>
        <button
          className="button secondary"
          onClick={() => downloadCsv(matching, categories)}
          disabled={!matching.length}
        >
          <Download size={15} /> Exportar tabela
        </button>
      </div>
      <div className="table-tools">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Buscar transações"
            placeholder="Buscar descrição, categoria ou ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <select
          aria-label="Tipo de transação"
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">Todos os tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th aria-sort={sort === 'date' ? (descending ? 'descending' : 'ascending') : 'none'}>
                <button className="sort-button" onClick={() => toggleSort('date')}>
                  Data <ArrowDownUp size={12} />
                </button>
              </th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th
                className="numeric"
                aria-sort={
                  sort === 'amount_cents' ? (descending ? 'descending' : 'ascending') : 'none'
                }
              >
                <button className="sort-button" onClick={() => toggleSort('amount_cents')}>
                  Valor <ArrowDownUp size={12} />
                </button>
              </th>
              <th>
                <span className="sr-only">Detalhes</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id}>
                <td className="muted nowrap">{dateLabel(t.date)}</td>
                <td>
                  <button className="transaction-link" onClick={() => setSelected(t)}>
                    {t.description}
                    <span>{t.id}</span>
                  </button>
                </td>
                <td>{labels.get(t.category)}</td>
                <td>
                  <span className={`type-tag ${t.type}`}>
                    {t.type === 'receita' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td className={`numeric amount ${t.type}`}>
                  {t.type === 'despesa' ? '− ' : '+ '}
                  {money(t.amount_cents)}
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Detalhes de ${t.id}`}
                    onClick={() => setSelected(t)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty">
            <Search size={24} />
            <h3>Nenhuma transação encontrada</h3>
            <p>Altere o período, a categoria ou a busca.</p>
          </div>
        )}
      </div>
      <div className="pagination">
        <span>
          {matching.length
            ? `${(currentPage - 1) * 12 + 1}–${Math.min(currentPage * 12, matching.length)} de ${number(matching.length)}`
            : '0 registros'}
        </span>
        <div>
          <button
            className="icon-button"
            aria-label="Página anterior"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Página {currentPage} de {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Próxima página"
            disabled={currentPage >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null)
        }}
        aria-labelledby="transaction-title"
      >
        {selected && (
          <>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">DETALHE DO LANÇAMENTO</span>
                <h2 id="transaction-title">{selected.id}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Fechar detalhes"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="detail-value">{money(selected.amount_cents)}</p>
            <dl className="detail-list">
              {[
                ['Data', dateLabel(selected.date)],
                ['Descrição', selected.description],
                ['Categoria', labels.get(selected.category)],
                ['Tipo', selected.type === 'receita' ? 'Receita' : 'Despesa'],
                ['Contraparte', selected.counterparty],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="demo-note">
              Transação fictícia, criada exclusivamente para demonstração.
            </p>
          </>
        )}
      </dialog>
    </section>
  )
}
