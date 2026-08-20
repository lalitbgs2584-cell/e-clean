import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn, signUp } from '../lib/auth-client';

export default function LoginScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register-only fields
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data: sessionData, error: authError } = await signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) {
        console.log("Auth error:->", authError);
        setError(authError.message ?? 'Login failed. Please try again.');
      } else {
        const role = (sessionData?.user as any)?.role ?? 'CITIZEN';
        if (role === 'WORKER') {
          router.replace('/(worker)/(tabs)/home' as any);
        } else {
          router.replace('/(tabs)/home');
        }
      }
    } catch (e: any) {
      console.log("Error:->", e)
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) {
        console.log("Auth error register:->", authError)
        setError(authError.message ?? 'Registration failed. Please try again.');
      } else {
        // Signed up & session created — go to app
        router.replace('/(tabs)/home');
      }
    } catch (e: any) {
      console.log("Error register:->", e)
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = tab === 'login' ? handleLogin : handleRegister;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {tab === 'login' ? 'Welcome Back!' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {tab === 'login'
                ? 'Login to continue reporting civic issues'
                : 'Join e-clean and make a difference'}
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabItem, tab === 'login' && styles.tabItemActive]}
              onPress={() => { setTab('login'); setError(null); }}>
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Login</Text>
            </Pressable>
            <Pressable
              style={[styles.tabItem, tab === 'register' && styles.tabItemActive]}
              onPress={() => { setTab('register'); setError(null); }}>
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Register</Text>
            </Pressable>
          </View>

          {/* Input Fields */}
          <View style={styles.formGroup}>
            {tab === 'register' && (
              <>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ananya Sharma"
                  placeholderTextColor="#6B7A70"
                  autoCapitalize="words"
                  textContentType="name"
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#6B7A70"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#6B7A70"
              textContentType={tab === 'login' ? 'password' : 'newPassword'}
            />

            {tab === 'login' && (
              <Pressable style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action Button */}
          <Pressable
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FCFEFA" />
            ) : (
              <Text style={styles.loginBtnText}>
                {tab === 'login' ? 'Login' : 'Create Account'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBF8',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F5F8F3',
    borderRadius: 999,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DCE3D8',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 999,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(46, 90, 60, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  tabTextActive: {
    color: '#2E7D4F',
    fontWeight: '800',
  },
  formGroup: {
    gap: 8,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Sora',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    fontSize: 15,
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D4F',
    fontFamily: 'Plus Jakarta Sans',
  },
  errorBox: {
    backgroundColor: '#FFF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Plus Jakarta Sans',
  },
  loginBtn: {
    backgroundColor: '#2E7D4F',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: 'rgba(46, 90, 60, 0.25)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 4,
  },
  loginBtnText: {
    color: '#FCFEFA',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
});
