// entities/concept — реэкспорт типов графа знаний (определены в shared/api,
// т.к. shared не может импортировать entities).
export type { Graph, GraphNode, GraphEdge, NodeTier } from '@/shared/api';
// Источники утверждений узла и «Здесь ошибка» (T-0154, T-0166): зависят только от shared.
export { ClaimSources } from './ui/claim-sources';
