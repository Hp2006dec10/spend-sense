import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';
import { storage } from '@/utils/api';
import { useRouter } from 'expo-router';

const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  six: 64,
} as const;

export default function RegisterScreen() {
  const scheme = useColorScheme() || 'light';
  const colors = {
    ...(Colors[scheme] || Colors.light),
    backgroundElement: scheme === 'dark' ? '#212225' : '#F0F0F3',
    backgroundSelected: scheme === 'dark' ? '#2E3135' : '#E0E1E6',
    textSecondary: scheme === 'dark' ? '#B0B4BA' : '#60646C',
  };

  const { signup } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Strength Checker
  const [strength, setStrength] = useState({
    score: 0,
    label: 'Weak',
    color: '#E74C3C',
    requirements: { length: false, uppercase: false, lowercase: false, number: false, special: false },
  });

  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    const reqs = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[@$!%*?&]/.test(pass),
    };

    if (reqs.length) score++;
    if (reqs.uppercase) score++;
    if (reqs.lowercase) score++;
    if (reqs.number) score++;
    if (reqs.special) score++;

    let label = 'Weak';
    let color = '#E74C3C';

    if (score === 5) {
      label = 'Very Strong';
      color = '#2ECC71';
    } else if (score >= 4) {
      label = 'Strong';
      color = '#2ECC71';
    } else if (score >= 3) {
      label = 'Medium';
      color = '#F1C40F';
    }

    setStrength({ score, label, color, requirements: reqs });
  };

  useEffect(() => {
    checkPasswordStrength(password);
  }, [password]);

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg('All fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (strength.score < 3) {
      setErrorMsg('Please use a stronger password');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const data = await signup(fullName.trim(), email.trim(), password, confirmPassword);
      setSuccessMsg(data.message || 'Registration successful! Logging you in...');
      // Navigation to /(tabs) will occur automatically via RootNavigation due to user state change
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
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
              <Text style={[styles.formTitle, { color: colors.text }]}>Create Account</Text>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="John Doe"
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="john@example.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="Minimum 8 characters"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* Password Policy & Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthWrapper}>
                  <View style={styles.strengthRow}>
                    <Text style={{ color: colors.textSecondary }}>Strength: </Text>
                    <Text style={{ color: strength.color, fontWeight: 'bold' }}>{strength.label}</Text>
                  </View>
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: `${(strength.score / 5) * 100}%`,
                          backgroundColor: strength.color,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.policyList}>
                    <Text style={{ fontSize: 11, color: strength.requirements.length ? '#2ECC71' : '#E74C3C' }}>
                      • At least 8 characters
                    </Text>
                    <Text style={{ fontSize: 11, color: strength.requirements.uppercase ? '#2ECC71' : '#E74C3C' }}>
                      • Contains uppercase letter (A-Z)
                    </Text>
                    <Text style={{ fontSize: 11, color: strength.requirements.lowercase ? '#2ECC71' : '#E74C3C' }}>
                      • Contains lowercase letter (a-z)
                    </Text>
                    <Text style={{ fontSize: 11, color: strength.requirements.number ? '#2ECC71' : '#E74C3C' }}>
                      • Contains number (0-9)
                    </Text>
                    <Text style={{ fontSize: 11, color: strength.requirements.special ? '#2ECC71' : '#E74C3C' }}>
                      • Contains special character (@$!%*?&)
                    </Text>
                  </View>
                </View>
              )}

              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="Confirm password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <Pressable
                onPress={handleSignup}
                disabled={isSubmitting}
                style={styles.primaryBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Register</Text>
                )}
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={{ color: colors.textSecondary }}>Already have an account? </Text>
                <Pressable onPress={() => router.push('/login' as any)}>
                  <Text style={styles.switchLink}>Sign In</Text>
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
  strengthWrapper: {
    padding: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
    gap: Spacing.one,
  },
  strengthRow: {
    flexDirection: 'row',
  },
  strengthBarBg: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  policyList: {
    gap: Spacing.half,
    marginTop: Spacing.one,
  },
});
