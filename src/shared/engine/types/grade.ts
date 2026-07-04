// Результат скоринга продукции. См. docs/architecture/02-logical.md §7.

export interface GradeCriterion {
  name: string;
  score: number;
  max: number;
  comment: string;
}

export interface GradeError {
  /** 'collocation' | 'grammar' | 'coherence' | ... — задаётся рубрикой модуля. */
  kind: string;
  excerpt: string;
  correction: string;
  explanation: string;
}

export interface Grade {
  rubricId: string;
  rubricVersion: number;
  criteria: GradeCriterion[];
  /** Итоговый балл (напр. band 6.5). */
  overall?: number;
  /** Ошибки → питают error-log/SRS. */
  errors: GradeError[];
  /** Образцовый переписанный вариант. */
  exemplar?: string;
  /** true = черновой локальный сигнал (офлайн-fallback), не полный скоринг. */
  gradedOfflineFallback?: boolean;
}
