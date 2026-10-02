// Выбор способа запоминания (T-0063): повторение карточек или вспоминание по первым буквам.
// Смена пересобирает курс на сервере, но освоенность и ошибки не трогает — они принадлежат
// человеку, а не способу.
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getStudyMethods, setStudyMethod, type StudyMethodChoice } from '@/shared/api';
import { Muted, Note, radius, space, useTheme } from '@/shared/ui';
import { activeMethod, canChoose, optionsFor, REMEMBER_PURPOSE } from '../model/options';

export function StudyMethodPicker() {
  const { colors } = useTheme();
  const [choice, setChoice] = useState<StudyMethodChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStudyMethods()
      .then(setChoice)
      .catch(() => setChoice(null)); // офлайн: выбор недоступен, остальное работает
  }, []);

  if (!choice || !canChoose(choice, REMEMBER_PURPOSE))
    return <Muted>Выбор способа появится при подключении.</Muted>;

  const active = activeMethod(choice, REMEMBER_PURPOSE);

  async function pick(id: string) {
    if (busy || id === active) return;
    setBusy(true);
    setError(null);
    try {
      setChoice(await setStudyMethod(REMEMBER_PURPOSE, id));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <Muted>Как закреплять понятия. Освоенность при смене не сбрасывается.</Muted>
      {optionsFor(choice, REMEMBER_PURPOSE).map((o) => {
        const selected = o.id === active;
        return (
          <Pressable
            key={o.id}
            onPress={() => void pick(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: busy }}
            style={{
              padding: space.sm,
              borderRadius: radius.sm,
              backgroundColor: selected ? colors.accent : colors.surfaceAlt,
            }}
          >
            <Text style={{ color: selected ? colors.onAccent : colors.muted }}>{o.title}</Text>
          </Pressable>
        );
      })}
      {error && <Note tone="danger">{error}</Note>}
    </View>
  );
}
