// src/screens/Payment.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, shadow, type, iconSize } from '../theme';

export default function Payment({ route, navigation }) {
  const { balance } = route.params;
  const { user } = useAuth();

  const [mode, setMode] = useState('full');
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState('NFC');
  const [busy, setBusy] = useState(false);

  const computedAmount = (() => {
    if (mode === 'full') return balance;
    if (mode === 'half') return balance / 2;
    if (mode === 'custom') {
      const n = Number(customAmount);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  })();

  const remainingAfter = Math.max(0, balance - computedAmount);

  const customError = (() => {
    if (mode !== 'custom') return null;
    if (!customAmount) return null;
    const n = Number(customAmount);
    if (isNaN(n) || n <= 0) return 'Enter a valid amount.';
    if (n > balance) return `Cannot exceed ₱${balance.toLocaleString()}.`;
    return null;
  })();

  const canPay =
    computedAmount > 0 && computedAmount <= balance && !customError && !busy;

  const handlePay = () => {
    if (!canPay) return;

    Alert.alert(
      'Confirm payment',
      `Pay ₱${computedAmount.toLocaleString()} via ${method}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBusy(true);
            try {
              const { data, error } = await supabase
                .from('payments')
                .insert([
                  {
                    user_id: user.id,
                    amount: computedAmount,
                    status: 'paid',
                    method: method,
                  },
                ])
                .select()
                .single();
              if (error) throw error;

              Alert.alert(
                'Payment successful',
                `Amount: ₱${computedAmount.toLocaleString()}\nTransaction: ${data.id
                  .slice(0, 8)
                  .toUpperCase()}\n\nRemaining: ₱${remainingAfter.toLocaleString()}`,
                [
                  {
                    text: 'OK',
                    onPress: () =>
                      navigation.navigate('Main', { screen: 'Bill' }),
                  },
                ]
              );
            } catch (e) {
              Alert.alert('Payment failed', e.message);
            }
            setBusy(false);
          },
        },
      ]
    );
  };

  if (busy) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.patient} />
        <Text style={s.processing}>Processing payment…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.screen}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ─────── Hero: Amount Due ─────── */}
      <View style={s.hero}>
        <Text style={s.overline}>AMOUNT DUE</Text>
        <Text style={s.heroAmount}>₱{balance.toLocaleString()}</Text>
      </View>

      {/* ─────── Options ─────── */}
      <View>
        <Text style={s.sectionTitle}>Payment option</Text>

        <OptionRow
          icon="dollar-sign"
          title="Pay full balance"
          subtitle={`₱${balance.toLocaleString()}`}
          selected={mode === 'full'}
          onPress={() => setMode('full')}
        />

        <OptionRow
          icon="divide"
          title="Pay half"
          subtitle={`₱${(balance / 2).toLocaleString()}`}
          selected={mode === 'half'}
          onPress={() => setMode('half')}
        />

        <OptionRow
          icon="edit-3"
          title="Custom amount"
          subtitle="Enter your own amount"
          selected={mode === 'custom'}
          onPress={() => setMode('custom')}
        />
      </View>

      {/* ─────── Custom Input ─────── */}
      {mode === 'custom' && (
        <View style={s.inputWrap}>
          <Text style={s.inputLabel}>Amount</Text>
          <View
            style={[s.inputBox, customError && s.inputBoxError]}
          >
            <Text style={s.inputPrefix}>₱</Text>
            <TextInput
              style={s.input}
              value={customAmount}
              onChangeText={(v) => setCustomAmount(v.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.ink300}
              editable={!busy}
            />
          </View>
          {customError ? (
            <Text style={s.errorText}>{customError}</Text>
          ) : (
            <Text style={s.hintText}>
              Maximum ₱{balance.toLocaleString()}
            </Text>
          )}
        </View>
      )}

      {/* ─────── Method ─────── */}
      <View>
        <Text style={s.sectionTitle}>Payment method</Text>

        <View style={s.methodRow}>
          <MethodChip
            icon="wifi"
            label="NFC"
            selected={method === 'NFC'}
            onPress={() => setMethod('NFC')}
          />
          <MethodChip
            icon="credit-card"
            label="Card"
            selected={method === 'Credit Card'}
            onPress={() => setMethod('Credit Card')}
          />
          <MethodChip
            icon="dollar-sign"
            label="Cash"
            selected={method === 'Cash'}
            onPress={() => setMethod('Cash')}
          />
        </View>
      </View>

      {/* ─────── Summary ─────── */}
      <View style={s.card}>
        <Row
          label="Paying now"
          value={`₱${computedAmount.toLocaleString()}`}
          valueColor={colors.ink900}
          valueWeight="600"
        />
        <Row
          label="Remaining after"
          value={`₱${remainingAfter.toLocaleString()}`}
          valueColor={remainingAfter > 0 ? colors.warning : colors.success}
          valueWeight="600"
        />
        {remainingAfter <= 0 && computedAmount > 0 && (
          <View style={s.fullyPaidHint}>
            <Feather
              name="check-circle"
              size={14}
              color={colors.success}
            />
            <Text style={s.fullyPaidText}>
              This will fully settle your bill
            </Text>
          </View>
        )}
      </View>

      {/* ─────── Pay Button ─────── */}
      <TouchableOpacity
        style={[s.btn, s.btnPrimary, !canPay && s.btnDisabled]}
        onPress={handlePay}
        disabled={!canPay}
        activeOpacity={0.8}
      >
        <Feather
          name="lock"
          size={iconSize.ui}
          color={canPay ? colors.white : colors.ink500}
        />
        <Text style={canPay ? s.btnPrimaryText : s.btnDisabledText}>
          {canPay
            ? `Pay ₱${computedAmount.toLocaleString()}`
            : 'Enter a valid amount'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────── Components ───────────

const OptionRow = ({ icon, title, subtitle, selected, onPress }) => (
  <TouchableOpacity
    style={[s.option, selected && s.optionSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[s.optionIcon, selected && s.optionIconSelected]}>
      <Feather
        name={icon}
        size={18}
        color={selected ? colors.patient : colors.ink500}
      />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[s.optionTitle, selected && s.optionTitleSelected]}>
        {title}
      </Text>
      <Text style={s.optionSub}>{subtitle}</Text>
    </View>
    <View style={[s.radio, selected && s.radioSelected]}>
      {selected && <View style={s.radioInner} />}
    </View>
  </TouchableOpacity>
);

const MethodChip = ({ icon, label, selected, onPress }) => (
  <TouchableOpacity
    style={[s.method, selected && s.methodSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Feather
      name={icon}
      size={18}
      color={selected ? colors.patient : colors.ink500}
    />
    <Text style={[s.methodLabel, selected && s.methodLabelSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const Row = ({ label, value, valueColor, valueWeight }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text
      style={[
        s.rowValue,
        valueColor && { color: valueColor },
        valueWeight && { fontWeight: valueWeight },
      ]}
    >
      {value}
    </Text>
  </View>
);

// ─────────── Styles ───────────

const s = StyleSheet.create({
  screen: {
    padding: spacing.base,
    backgroundColor: colors.ink50,
    gap: spacing.base,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ink50,
    gap: spacing.md,
  },
  processing: {
    ...type.caption,
    marginTop: spacing.sm,
  },

  // ── Hero ──
  hero: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  overline: {
    ...type.overline,
    marginBottom: spacing.sm,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -1,
  },

  // ── Section ──
  sectionTitle: {
    ...type.overline,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  // ── Option Row ──
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    padding: spacing.base,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadow.card,
  },
  optionSelected: {
    borderColor: colors.patient,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.ink100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconSelected: {
    backgroundColor: colors.patientSoft,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink900,
  },
  optionTitleSelected: {
    color: colors.patient,
  },
  optionSub: {
    ...type.caption,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.ink300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.patient,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.patient,
  },

  // ── Custom Input ──
  inputWrap: {
    gap: spacing.sm,
  },
  inputLabel: {
    ...type.overline,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.ink100,
    ...shadow.card,
  },
  inputBoxError: {
    borderColor: colors.danger,
  },
  inputPrefix: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink500,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.base,
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink900,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
  },
  hintText: {
    ...type.caption,
  },

  // ── Method Chips ──
  methodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  method: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.ink100,
    ...shadow.card,
  },
  methodSelected: {
    borderColor: colors.patient,
    backgroundColor: colors.patientSoft,
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink700,
  },
  methodLabelSelected: {
    color: colors.patient,
  },

  // ── Summary Card ──
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    ...type.caption,
  },
  rowValue: {
    fontSize: 14,
    color: colors.ink900,
  },
  fullyPaidHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
  },
  fullyPaidText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },

  // ── Primary Button ──
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
    borderRadius: radius.md,
    minHeight: 52,
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
});