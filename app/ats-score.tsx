import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const BRAND = '#4F46E5';
const INK = '#0F172A';
const BODY = '#475569';
const MUTED = '#94A3B8';
const BORDER = '#E2E8F0';
const BG = '#F8FAFC';
const CARD = '#FFFFFF';
const GOOD = '#16A34A';

/** Static marketing page — no auth, no app chrome. One job: capture the email. */
export default function AtsScoreScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Pull UTM campaign + promo code from the URL (?utm_campaign=...&code=LINKEDIN20)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).location?.search) {
      try {
        const params = new URLSearchParams((globalThis as any).location.search);
        setUtmCampaign(params.get('utm_campaign') || 'linkedin-ats-score');
      } catch {
        setUtmCampaign('linkedin-ats-score');
      }
    }
  }, []);

  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      Toast.show({ type: 'error', text1: 'Invalid email', text2: 'Please enter a valid email address.' });
      return;
    }
    setLoading(true);
    try {
      // POST to the LIVE email-capture endpoint (same origin in prod; Vercel dev server proxies /api)
      const base = Platform.OS === 'web' && typeof location !== 'undefined' ? '' : 'https://appinterviewready.top';
      const res = await fetch(`${base}/api/email/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: name.trim() || undefined,
          source: 'linkedin',
          utm_campaign: utmCampaign,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.success) {
        throw new Error(data?.error || `Capture failed (${res.status})`);
      }
      setDone(true);
      Toast.show({
        type: 'success',
        text1: 'Check your inbox!',
        text2: 'Your free AI resume score + 20 credits are on the way.',
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Something went wrong', text2: e?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.card}>
          <Ionicons name="checkmark-circle" size={64} color={GOOD} />
          <Text style={styles.doneTitle}>Check your inbox ✨</Text>
          <Text style={styles.body}>We just sent your free AI resume score and 20 free AI credits to {email.trim().toLowerCase()}.
Use code <Text style={styles.code}>LINKEDIN20</Text> at signup to unlock everything.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/signup')}>
            <Text style={styles.primaryBtnText}>Create your account →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.brand}>INTERVIEW READY</Text>
          <Text style={styles.h1}>Your resume, scored in 60 seconds.</Text>
          <Text style={styles.sub}>
            Paste your resume against any job description and get an instant ATS score, keyword gaps, and a rewrite plan — free.
          </Text>

          <View style={styles.bullets}>
            {[
              'Instant ATS compatibility score',
              'Keyword gaps vs. the exact job',
              'Rewrite plan recruiters actually see',
            ].map((t) => (
              <View key={t} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={18} color={GOOD} />
                <Text style={styles.bulletText}>{t}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={MUTED}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>First name <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Jane"
            placeholderTextColor={MUTED}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
          />

          <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Get my free resume score →</Text>}
          </Pressable>

          <Text style={styles.tiny}>
            Free forever for your first score. Use code <Text style={styles.code}>LINKEDIN20</Text> for 20 bonus AI credits at signup.
          </Text>
        </View>

        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Back to home</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: BG },
  container: { flexGrow: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, backgroundColor: CARD, borderRadius: 18, padding: 30, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4, alignItems: 'center' },
  brand: { color: BRAND, fontWeight: '800', fontSize: 12, letterSpacing: 1.6, marginBottom: 12 },
  h1: { fontSize: 26, fontWeight: '800', color: INK, textAlign: 'center', lineHeight: 34 },
  sub: { fontSize: 15, color: BODY, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  bullets: { alignSelf: 'stretch', marginTop: 20, marginBottom: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 },
  bulletText: { fontSize: 14, color: INK, flex: 1 },
  label: { alignSelf: 'flex-start', fontSize: 13, fontWeight: '700', color: INK, marginTop: 16, marginBottom: 6 },
  optional: { color: MUTED, fontWeight: '400' },
  input: { alignSelf: 'stretch', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: INK, backgroundColor: '#FBFCFE' },
  primaryBtn: { alignSelf: 'stretch', backgroundColor: BRAND, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  tiny: { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 14, lineHeight: 18 },
  code: { fontWeight: '800', color: BRAND },
  doneTitle: { fontSize: 22, fontWeight: '800', color: INK, marginTop: 16, textAlign: 'center' },
  body: { fontSize: 15, color: BODY, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  backLink: { marginTop: 18 },
  backLinkText: { color: MUTED, fontSize: 14, fontWeight: '600' },
});
