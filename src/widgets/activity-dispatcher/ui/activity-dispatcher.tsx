// Диспетчер: по activity.type находит рендерер в реестре и рендерит его.
// Каркас Ф0 — на всех типах пока единый плейсхолдер (WS5).
import type { ComponentType } from 'react';
import { Text } from 'react-native';
import type { Activity, ActivityRendererProps, ResponseDraft } from '@/shared/engine';
import { useModuleRegistry } from '@/shared/lib';

export function ActivityDispatcher({
  activity,
  onComplete,
}: {
  activity: Activity;
  onComplete?: (draft: ResponseDraft) => void;
}) {
  const registry = useModuleRegistry();
  const renderer = registry.getRenderer(activity.type);

  if (!renderer) {
    return <Text>Неизвестный тип Activity: {activity.type}</Text>;
  }

  // Рендерер в ядре opaque (`(props) => unknown`, без зависимости от React).
  // На клиенте это React-компонент — приводим тип для JSX.
  const Renderer = renderer as ComponentType<ActivityRendererProps>;
  return <Renderer activity={activity} onComplete={onComplete ?? (() => {})} />;
}
