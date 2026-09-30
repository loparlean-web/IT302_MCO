// src/screens/Register.js
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

export default function Register({ navigation }) {
  const { register } = useAuth();
  const [f, setF] = useState({
    name: '',
    username: '',
    password: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const up = (k, v) => {
    setF((prev) => ({ ...prev, [k]: v }));
    if (error) setError('');
  };

  // Validation
  const nameOk = f.name.trim().length > 0;
  const usernameOk = f.username.trim().length > 0;
  const passwordOk = f.password.length >= 6;
  const canSubmit = nameOk && usernameOk && passwordOk && !busy;

  const handleRegister = async () => {
    if (!nameOk || !usernameOk || !passwordOk) {
      if (!nameOk) return setError('Please enter your full name.');
      if (!usernameOk) return setError('Please choose a username.');
      if (!passwordOk)
        return setError('Password must be at least 6 characters.');
    }

    setError('');
    setBusy(true);

    const ok = await register(f);

    setBusy(false);
    if (!ok) {
      setError('Registration failed. Username may already exist.');
    }
    // On success, AuthContext updates user → navigates automatically
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
            <Feather name="user-plus" size={28} color={colors.patient} />
          </View>
          <Text style={s.brandName}>Create Account</Text>
          <Text style={s.brandTag}>Patient registration</Text>
        </View>

        {/* ─────── Form ─────── */}
        <View style={s.form}>
          {/* Full name */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>Full name</Text>
              <Text style={s.required}>Required</Text>
            </View>
            <View style={[s.inputBox, !nameOk && f.name !== '' && s.inputBoxWarn]}>
              <Feather name="user" size={16} color={colors.ink500} />
              <TextInput
                style={s.input}
                value={f.name}
                onChangeText={(v) => up('name', v)}
                placeholder="John Doe"
                placeholderTextColor={colors.ink300}
                editable={!busy}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Username */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>Username</Text>
              <Text style={s.required}>Required</Text>
            </View>
            <View
              style={[s.inputBox, !usernameOk && f.username !== '' && s.inputBoxWarn]}
            >
              <Feather name="at-sign" size={16} color={colors.ink500} />
              <TextInput
                style={s.input}
                value={f.username}
                onChangeText={(v) => up('username', v)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="johndoe"
                placeholderTextColor={colors.ink300}
                editable={!busy}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>Password</Text>
              <Text style={s.required}>Min 6 characters</Text>
            </View>
            <View
              style={[
                s.inputBox,
                f.password !== '' && !passwordOk && s.inputBoxWarn,
              ]}
            >
              <Feather name="lock" size={16} color={colors.ink500} />
              <TextInput
                style={s.input}
                value={f.password}
                onChangeText={(v) => up('password', v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="••••••••"
                placeholderTextColor={colors.ink300}
                editable={!busy}
                returnKeyType="next"
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
            {f.password !== '' && (
              <View style={s.strengthRow}>
                <View
                  style={[
                    s.strengthDot,
                    { backgroundColor: passwordOk ? colors.success : colors.ink300 },
                  ]}
                />
                <Text style={s.strengthText}>
                  {passwordOk
                    ? 'Password meets requirements'
                    : `${6 - f.password.length} more character${
                        6 - f.password.length === 1 ? '' : 's'
                      } needed`}
                </Text>
              </View>
            )}
          </View>

          {/* Phone (optional) */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>Phone</Text>
              <Text style={s.optional}>Optional</Text>
            </View>
            <View style={s.inputBox}>
              <Feather name="phone" size={16} color={colors.ink500} />
              <TextInput
                style={s.input}
                value={f.phone}
                onChangeText={(v) => up('phone', v)}
                keyboardType="phone-pad"
                placeholder="09171234567"
                placeholderTextColor={colors.ink300}
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
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
            onPress={handleRegister}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather
                  name="check"
                  size={iconSize.ui}
                  color={canSubmit ? colors.white : colors.ink500}
                />
                <Text
                  style={canSubmit ? s.btnPrimaryText : s.btnDisabledText}
                >
                  Create account
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ─────── Footer ─────── */}
        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Text style={s.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────── Styles ───────────

const s = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.ink50,
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },

  // ── Brand ──
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.patientSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
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

  // ── Field ──
  field: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...type.overline,
  },
  required: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.ink500,
    letterSpacing: 0.2,
  },
  optional: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.ink300,
    letterSpacing: 0.2,
  },

  // ── Input ──
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
  inputBoxWarn: {
    borderColor: colors.warning,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.ink900,
  },

  // ── Password strength ──
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  strengthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  strengthText: {
    fontSize: 11,
    color: colors.ink500,
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
    flex: 1,
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
    marginTop: spacing.sm,
  },
  btnPrimary: { backgroundColor: colors.patient },
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

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footerText: {
    ...type.caption,
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.patient,
  },
});