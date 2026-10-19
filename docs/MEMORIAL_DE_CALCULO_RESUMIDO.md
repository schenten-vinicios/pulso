# Pulso — Memorial de cálculo resumido

Dados fictícios da Casa Grão, usados exclusivamente para demonstração. Os exemplos financeiros consideram **01/07/2025 a 31/12/2025**, com todas as categorias. Nas comparações, o período anterior é **01/01/2025 a 30/06/2025**.

## Métricas financeiras e comerciais

| Métrica | Cálculo | Exemplo na base do projeto |
| --- | --- | --- |
| **Receita total** | Soma dos valores das transações de receita. | Vendas da loja física, online e corporativas somadas = **R$ 342.237,09**. |
| **Despesas totais** | Soma dos valores das transações de despesa. | Insumos + Pessoal + Ocupação + Impostos e taxas + Marketing + Operação = **R$ 251.686,37**. |
| **Resultado financeiro** | Receita total − Despesas totais. | R$ 342.237,09 − R$ 251.686,37 = **R$ 90.550,72**. |
| **Margem de resultado** | (Resultado financeiro ÷ Receita total) × 100. | (90.550,72 ÷ 342.237,09) × 100 ≈ **26,5%**. |
| **Quantidade de vendas** | Contagem das transações de receita; cada transação corresponde a uma venda. | **4.170 vendas** no semestre. |
| **Ticket médio** | Receita total ÷ Quantidade de vendas. | R$ 342.237,09 ÷ 4.170 ≈ **R$ 82,07** por venda. |
| **Quantidade de transações** | Quantidade de receitas + Quantidade de despesas. | 4.170 + 54 = **4.224 transações**. |
| **Despesa por categoria** | Soma das despesas pertencentes à categoria. | Soma dos lançamentos de Pessoal = **R$ 89.548,20**. |
| **Participação da categoria nas despesas** | (Despesa da categoria ÷ Despesas totais filtradas) × 100. | Pessoal: (89.548,20 ÷ 251.686,37) × 100 ≈ **35,6%**. |
| **Categoria com maior despesa** | Categoria com a maior soma de despesas no período. | **Pessoal**, com **R$ 89.548,20**. |
| **Melhor resultado mensal** | Maior valor de Receita do mês − Despesas do mês entre os meses selecionados. | Dezembro/2025: R$ 75.536,86 − R$ 51.157,10 = **R$ 24.379,76**. |
| **Variação percentual** | [(Valor atual − Valor anterior) ÷ Valor absoluto do anterior] × 100. Aplicada a receita, despesas, resultado e ticket. | Receita: [(342.237,09 − 245.309,04) ÷ 245.309,04] × 100 ≈ **+39,5%**. |
| **Variação da margem** | Margem atual (%) − Margem anterior (%), em pontos percentuais. | 26,4585% − 13,6365% ≈ **+12,8 p.p.** |

As mesmas fórmulas são aplicadas ao mês ou ao período selecionado, respeitando o filtro de categoria e incluindo as datas inicial e final. Margem e ticket do período são calculados sobre os totais, sem fazer média simples dos valores mensais.

Os cálculos usam valores completos; o arredondamento ocorre na apresentação. Sem receita, a margem fica indefinida; sem vendas, o ticket fica indefinido. Variações percentuais com valor anterior zero, ou comparações fora da cobertura da base, aparecem como **“—”**.

## Métricas de qualidade dos dados

Estes exemplos consideram a base completa, de janeiro de 2024 a dezembro de 2025.

| Métrica | Cálculo | Exemplo na base do projeto |
| --- | --- | --- |
| **Registros recebidos** | Contagem das linhas do arquivo bruto, excluindo o cabeçalho. | **13.676 registros**. |
| **Registros isolados** | Contagem das linhas reprovadas na validação, uma vez por linha. | **1 registro** inválido excluído dos cálculos. |
| **Duplicidades removidas** | Contagem das cópias idênticas excedentes entre as linhas válidas, mantendo uma por grupo. | **2 cópias** removidas. |
| **Transações válidas** | Registros recebidos − Registros isolados − Duplicidades removidas. | 13.676 − 1 − 2 = **13.673 transações**. |
| **Campos descritivos preenchidos** | Contagem das células vazias de descrição ou contraparte preenchidas antes da remoção de duplicidades. | **2 campos** preenchidos; não são transações adicionais. |
