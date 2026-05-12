# PayFlow Design System

Direcao visual: Revenue Command Center para WhatsApp, recuperacao, pagamentos e tracking.

## Tokens

- Fonte principal: Geist.
- Numeros e metricas: Geist Mono com `tabular-nums`.
- Fundo: claro premium com grid sutil e profundidade azul fria.
- Radius padrao: `rounded-lg` em paineis, `rounded-md` em controles e badges.
- Sombra padrao: `shadow-command` em superficies e `shadow-soft` apenas no hover.
- Superficie operacional: `data-panel`.
- Area escura de comando: `command-panel`.
- Barras de filtro/formulario: `toolbar`.
- Acoes primarias: azul PayFlow.
- Positivo: verde apenas para recuperacao, aprovado e online.
- Atencao: ambar para pendencias.
- Risco: vermelho para erro, perda, chargeback e falha.

## Componentes

- Use `PageHeader` para topo de paginas internas.
- Use `MetricCard` para KPIs com leitura rapida.
- Use `DataTable` para tabelas operacionais e relatórios.
- Use `StatusBadge` para estados, sem depender apenas de cor.
- Use `EmptyState`, `LoadingState` e `ErrorState` para estados sem dados, carregamento e falha.
- Use `IntegrationLogo` e os assets locais para marcas de integracao.

## Regras Visuais

- Cards com radius pequeno e sombra fria, evitando aparencia de template.
- Botões com hover e active discretos.
- Filtros sempre agrupados em `toolbar`.
- Tabelas com header denso, sticky e boa leitura horizontal.
- Dashboard prioriza: receita, conversas, pagamentos pendentes, recuperacao e performance.
- Mobile empilha os paineis e mantem a navegacao horizontal acessivel.
- `live-dot` deve indicar estado realmente online/ativo, nao decoracao generica.
- Micrograficos so devem aparecer quando forem alimentados por dado real.
- `RECOVERY` usa verde/cyan; ambar fica reservado para pendencia e risco.
