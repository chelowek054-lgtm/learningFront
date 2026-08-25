// Онбординг (WS8): цели пользователя → profile.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, type Palette } from '@/shared/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/entities/session';
import { updateProfile } from '@/shared/api';

export function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { refresh } = useSession();
  const [band, setBand] = useState('7.0');
  const [topics, setTopics] = useState('transformers, attention');
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await updateProfile({
        onboarded: true,
        targetBand: Number.parseFloat(band) || 7,
        mlTopics: topics
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.form}>
        <Text style={styles.h1}>Цели обучения</Text>
        <Text style={styles.sub}>Настроим план под вас.</Text>

        <Text style={styles.label}>Целевой балл IELTS</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={band}
          onChangeText={setBand}
        />

        <Text style={styles.label}>Темы ML (через запятую)</Text>
        <TextInput style={styles.input} value={topics} onChangeText={setTopics} />

        <Pressable style={styles.btn} onPress={finish} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Начать</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, justifyContent: 'center' },
    form: { padding: 24, gap: 10 },
    h1: { fontSize: 26, fontWeight: '700', color: c.ink },
    sub: { fontSize: 14, color: c.muted, marginBottom: 8 },
    label: { fontSize: 13, color: c.muted, marginTop: 6 },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: c.ink,
      backgroundColor: c.surface,
    },
    btn: {
      backgroundColor: c.accent,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    btnText: { color: c.onAccent, fontSize: 16, fontWeight: '600' },
  });
