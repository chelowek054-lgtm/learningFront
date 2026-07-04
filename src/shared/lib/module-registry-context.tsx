// React-контекст реестра модулей. Позволяет pages/widgets читать реестр,
// не импортируя app-слой (правило импортов FSD: только вниз).
import { createContext, useContext, type ReactNode } from 'react';
import type { ModuleRegistry } from '@/shared/engine';

const ModuleRegistryContext = createContext<ModuleRegistry | null>(null);

export function ModuleRegistryProvider({
  registry,
  children,
}: {
  registry: ModuleRegistry;
  children: ReactNode;
}) {
  return (
    <ModuleRegistryContext.Provider value={registry}>{children}</ModuleRegistryContext.Provider>
  );
}

export function useModuleRegistry(): ModuleRegistry {
  const registry = useContext(ModuleRegistryContext);
  if (!registry) {
    throw new Error('useModuleRegistry: отсутствует <ModuleRegistryProvider>');
  }
  return registry;
}
