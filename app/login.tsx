import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';

const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  six: 64,
} as const;

export default function LoginScreen() {
  const scheme = useColorScheme() || 'light';
  const colors = {
    ...(Colors[scheme] || Colors.light),
    backgroundElement: scheme === 'dark' ? '#212225' : '#F0F0F3',
    backgroundSelected: scheme === 'dark' ? '#2E3135' : '#E0E1E6',
    textSecondary: scheme === 'dark' ? '#B0B4BA' : '#60646C',
  };

  const { login, gatewayBypass } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Access Gateway State
  const [isBypassing, setIsBypassing] = useState(false);

  const handleAnonymousTest = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsBypassing(true);
    try {
      // Use the default code directly to bypass login
      await gatewayBypass('COMP2026');
    } catch (err: any) {
      setErrorMsg(err.message || 'Anonymous login failed. Please try again.');
    } finally {
      setIsBypassing(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Email and password are required');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView style={{ flex: 1 }}>
        <SafeAreaView style={styles.authContainer}>
          <View style={[styles.authCard, { backgroundColor: colors.backgroundElement }]}>
            <Image
              source={require('@/assets/images/spend-sense-app-icon.png')}
              style={styles.brandLogo}
              resizeMode="cover"
            />
            <Text style={styles.brandTitle}>SpendSense</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              Personal Finance, Intelligently Tracked
            </Text>

            {/* Error & Success Messages */}
            {errorMsg && (
              <View style={styles.errorAlert}>
                <Text style={styles.alertText}>{errorMsg}</Text>
              </View>
            )}
            {successMsg && (
              <View style={styles.successAlert}>
                <Text style={styles.alertText}>{successMsg}</Text>
              </View>
            )}

            <View style={styles.form}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Sign In</Text>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="email@example.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="Enter password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />


              <Pressable
                onPress={handleLogin}
                disabled={isSubmitting}
                style={styles.primaryBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleAnonymousTest}
                disabled={isBypassing || isSubmitting}
                style={styles.gatewayBtn}
              >
                {isBypassing ? (
                  <ActivityIndicator color="#4A90E2" />
                ) : (
                  <Text style={styles.gatewayBtnText}>Test anonymously</Text>
                )}
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={{ color: colors.textSecondary }}>Don't have an account? </Text>
                <Pressable onPress={() => router.push('/register' as any)}>
                  <Text style={styles.switchLink}>Sign Up</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    alignItems: 'center',
    padding: Spacing.four,
    paddingTop: Spacing.six,
  },
  authCard: {
    width: '100%',
    maxWidth: 450,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  brandLogo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: Spacing.one,
    borderRadius: 16,
    overflow: 'hidden',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  errorAlert: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#FDEDEC',
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  successAlert: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#EAF2F8',
    borderWidth: 1,
    borderColor: '#D4E6F1',
  },
  alertText: {
    fontSize: 12,
    color: '#1B4F72',
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    gap: Spacing.two,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing.one,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.half,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  primaryBtn: {
    height: 46,
    backgroundColor: '#4A90E2',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  switchLink: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  gatewayBtn: {
    height: 46,
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  gatewayBtnText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  helperText: {
    fontSize: 12,
    textAlign: 'left',
    marginTop: -Spacing.one,
    marginBottom: Spacing.three,
  },
  codeHighlight: {
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'flex-end',
    marginTop: Spacing.two,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#4A90E2',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
