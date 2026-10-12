// «Дерево» пути: шаги курса на холсте схемы (R-0066, T-0123): пройденное, текущее и закрытое — состояния схемы.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { getCourse, type Course } from '@/shared/api';
import { Empty, Screen, space } from '@/shared/ui';
import { courseAsGraph } from '../model/scheme';
import { SchemeView } from './scheme-view';

export function CourseTree({
  domain,
  title,
  onStart,
}: {
  domain: string;
  title?: string;
  onStart?: () => void;
}) {
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  useEffect(() => {
    getCourse(domain).then(setCourse, () => setCourse(null));
  }, [domain]);
  const view = useMemo(() => (course ? courseAsGraph(course) : null), [course]);

  if (course === undefined) return <ActivityIndicator style={{ marginTop: space.xl }} />;
  if (!course || !view) return <Empty text="Курс ещё не построен — откройте «Шаги»." />;
  return (
    <Screen>
      <SchemeView
        graph={{ nodes: view.nodes, edges: view.edges } as never}
        mastery={view.mastery}
        onStudy={onStart}
        studyLabel="Начать"
        fullscreenTitle={`${title ?? domain} · Дерево`}
        mode="tree"
      />
    </Screen>
  );
}
