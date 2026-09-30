// src/screens/Login.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, shadow, type, iconSize } from '../theme';

export default function Login({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = username.trim() && password && !busy;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError('');
    setBusy(true);

    const ok = await login(username.trim(), password);

    setBusy(false);
    if (!ok) {
      setError('Invalid username or password');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.screen}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─────── Brand ─────── */}
        <View style={s.brand}>
          <View style={s.logoWrap}>
            <Feather name="activity" size={30} color={colors.patient} />
          </View>
          <Text style={s.brandName}>Patient Portal</Text>
          <Text style={s.brandTag}>Hospital room management</Text>
        </View>

        {/* ─────── Form ─────── */}
        <View style={s.form}>
          <Text style={s.formTitle}>Welcome back</Text>
          <Text style={s.formSub}>Sign in to continue</Text>

          {/* Username */}
          <View style={s.field}>
            <Text style={s.label}>Username</Text>
            <View style={s.inputBox}>
              <Feather name="user" size={16} color={colors.ink500} />
              <TextInput
                style={s.input}
                value={username}
                onChangeText={(v) => {
                  setUsername(v);
                  if (error) setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="username"
                placeholderTextColor={colors.ink300}
                editable={!busy}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputBox}>
              <Feather name="lock" size={16} color={colors.ink500} />
              <TextInput
                style={s.input}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (error) setError('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="••••••••"
                placeholderTextColor={colors.ink300}
                editable={!busy}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={16}
                  color={colors.ink500}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={14} color={colors.danger} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, !canSubmit && s.btnDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather
                  name="arrow-right"
                  size={iconSize.ui}
                  color={canSubmit ? colors.white : colors.ink500}
                />
                <Text
                  style={canSubmit ? s.btnPrimaryText : s.btnDisabledText}
                >
                  Login
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Create account */}
          <TouchableOpacity
            style={[s.btn, s.btnGhost]}
            onPress={() => navigation.navigate('Register')}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Feather name="user-plus" size={iconSize.inline} color={colors.patient} />
            <Text style={s.btnGhostText}>Create Patient Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.ink50,
    justifyContent: 'center',
    gap: spacing.lg,
  },

  // ── Brand ──
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.patientSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.3,
  },
  brandTag: {
    ...type.caption,
  },

  // ── Form ──
  form: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.base,
    ...shadow.card,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink900,
    letterSpacing: -0.2,
  },
  formSub: {
    ...type.caption,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
  },

  // ── Field ──
  field: {
    gap: spacing.sm,
  },
  label: {
    ...type.overline,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.ink100,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.ink900,
  },

  // ── Error ──
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.danger,
  },

  // ── Buttons ──
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
    borderRadius: radius.md,
    minHeight: 52,
  },
  btnPrimary: {
    backgroundColor: colors.patient,
    marginTop: spacing.sm,
  },
  btnDisabled: { backgroundColor: colors.ink100 },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabledText: {
    color: colors.ink500,
    fontSize: 15,
    fontWeight: '600',
  },
  btnGhost: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.patient,
  },
  btnGhostText: {
    color: colors.patient,
    fontSize: 15,
    fontWeight: '600',
  },
});