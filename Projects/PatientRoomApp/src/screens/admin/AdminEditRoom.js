// src/screens/admin/AdminEditRoom.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { colors, spacing, radius, shadow, type, iconSize } from '../../theme';

export default function AdminEditRoom({ route, navigation }) {
  const { roomId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [room, setRoom] = useState(null);
  const [price, setPrice] = useState('');
  const [type, setType] = useState('Private');
  const [status, setStatus] = useState('available');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();
        if (error) throw error;

        const r = {
          ...data,
          number: data.room_number,
          price: Number(data.price),
        };
        setRoom(r);
        setPrice(String(r.price));
        setType(r.type);
        setStatus(r.status);
      } catch (e) {
        Alert.alert('Error', e.message, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
      setLoading(false);
    })();
  }, [roomId, navigation]);

  const numericPrice = Number(price);
  const priceValid =
    price !== '' && !isNaN(numericPrice) && numericPrice > 0 && numericPrice <= 100000;

  const hasChanges =
    room &&
    (numericPrice !== room.price || type !== room.type || status !== room.status);

  const handleSave = async () => {
    if (!priceValid) {
      return Alert.alert(
        'Invalid price',
        'Enter a value between 1 and 100,000.'
      );
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ price: numericPrice, type, status })
        .eq('id', roomId);
      if (error) throw error;

      Alert.alert('Saved', `Room ${room.number} updated.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (!room) return;
    Alert.alert('Reset changes', 'Restore original values?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          setPrice(String(room.price));
          setType(room.type);
          setStatus(room.status);
        },
      },
    ]);
  };

  // ─────────── LOADING ───────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.admin} />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={s.center}>
        <Feather name="alert-circle" size={iconSize.hero} color={colors.ink300} />
        <Text style={s.emptyTitle}>Room not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.screen}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─────── Room Hero ─────── */}
        <View style={s.hero}>
          <Text style={s.overline}>EDITING</Text>
          <Text style={s.heroNumber}>Room {room.number}</Text>
          <View style={s.heroMeta}>
            <Text style={s.heroMetaLabel}>ID</Text>
            <Text style={s.heroMetaValue}>
              {room.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ─────── Price Input ─────── */}
        <View>
          <Text style={s.label}>Price per day</Text>
          <View style={[s.inputBox, !priceValid && price !== '' && s.inputBoxError]}>
            <Text style={s.inputPrefix}>₱</Text>
            <TextInput
              style={s.input}
              value={price}
              onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="3500"
              placeholderTextColor={colors.ink300}
              editable={!saving}
            />
          </View>
          {price !== '' && !priceValid ? (
            <Text style={s.errorText}>
              Enter a value between 1 and 100,000
            </Text>
          ) : (
            <Text style={s.hintText}>
              Current ₱{room.price.toLocaleString()}
              {priceValid && numericPrice !== room.price
                ? ` · New ₱${numericPrice.toLocaleString()}`
                : ''}
            </Text>
          )}
        </View>

        {/* ─────── Type Selector ─────── */}
        <View>
          <Text style={s.label}>Room type</Text>
          <View style={s.chips}>
            {['Private', 'Semi-Private'].map((t) => {
              const active = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setType(t)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipLabel, active && s.chipLabelActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─────── Status Selector ─────── */}
        <View>
          <Text style={s.label}>Status</Text>
          <View style={s.chips}>
            {[
              { key: 'available', label: 'Available', color: colors.success },
              { key: 'reserved', label: 'Reserved', color: colors.warning },
              { key: 'occupied', label: 'Occupied', color: colors.danger },
            ].map(({ key, label, color }) => {
              const active = status === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.chip, active && { borderColor: color, backgroundColor: colors.white }]}
                  onPress={() => setStatus(key)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      s.chipDot,
                      { backgroundColor: active ? color : colors.ink300 },
                    ]}
                  />
                  <Text
                    style={[
                      s.chipLabel,
                      active && { color: colors.ink900, fontWeight: '700' },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─────── Change Summary ─────── */}
        {hasChanges && (
          <View style={s.summary}>
            <View style={s.summaryHeader}>
              <Feather name="edit-2" size={14} color={colors.admin} />
              <Text style={s.summaryTitle}>Changes</Text>
            </View>

            {numericPrice !== room.price && priceValid && (
              <SummaryRow
                label="Price"
                from={`₱${room.price.toLocaleString()}`}
                to={`₱${numericPrice.toLocaleString()}`}
              />
            )}
            {type !== room.type && (
              <SummaryRow label="Type" from={room.type} to={type} />
            )}
            {status !== room.status && (
              <SummaryRow label="Status" from={room.status} to={status} />
            )}
          </View>
        )}

        {/* ─────── Primary Actions ─────── */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[
              s.btn,
              s.btnPrimary,
              (!hasChanges || !priceValid || saving) && s.btnDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || !priceValid || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather
                  name="check"
                  size={iconSize.ui}
                  color={
                    !hasChanges || !priceValid ? colors.ink500 : colors.white
                  }
                />
                <Text
                  style={
                    !hasChanges || !priceValid
                      ? s.btnDisabledText
                      : s.btnPrimaryText
                  }
                >
                  {!hasChanges ? 'No changes to save' : 'Save changes'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.secondaryRow}>
            <TouchableOpacity
              style={[s.btn, s.btnGhost, s.btnHalf]}
              onPress={handleReset}
              disabled={saving || !hasChanges}
              activeOpacity={0.7}
            >
              <Feather name="rotate-ccw" size={iconSize.inline} color={colors.ink700} />
              <Text style={s.btnGhostText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btn, s.btnGhost, s.btnHalf]}
              onPress={() => navigation.goBack()}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Feather name="x" size={iconSize.inline} color={colors.ink700} />
              <Text style={s.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────── Summary Row ───────────

const SummaryRow = ({ label, from, to }) => (
  <View style={s.summaryRow}>
    <Text style={s.summaryLabel}>{label}</Text>
    <View style={s.summaryValues}>
      <Text style={s.summaryFrom}>{from}</Text>
      <Feather name="arrow-right" size={12} color={colors.ink500} />
      <Text style={s.summaryTo}>{to}</Text>
    </View>
  </View>
);

// ─────────── Styles ───────────

const s = StyleSheet.create({
  screen: {
    padding: spacing.base,
    backgroundColor: colors.ink50,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ink50,
    gap: spacing.md,
  },
  emptyTitle: {
    ...type.heading,
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
    color: colors.admin,
  },
  heroNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
  },
  heroMetaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.ink500,
    letterSpacing: 0.6,
  },
  heroMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink700,
    letterSpacing: 1,
  },

  // ── Label ──
  label: {
    ...type.overline,
    marginBottom: spacing.sm,
  },

  // ── Input ──
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
  hintText: {
    ...type.caption,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
    marginTop: spacing.sm,
  },

  // ── Chips ──
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.ink100,
    ...shadow.card,
  },
  chipActive: {
    borderColor: colors.admin,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink700,
  },
  chipLabelActive: {
    color: colors.admin,
  },

  // ── Summary ──
  summary: {
    backgroundColor: colors.adminSoft,
    borderRadius: radius.md,
    padding: spacing.base,
    gap: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.admin,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.ink700,
  },
  summaryValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryFrom: {
    fontSize: 13,
    color: colors.ink500,
    textDecorationLine: 'line-through',
  },
  summaryTo: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink900,
  },

  // ── Buttons ──
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
    borderRadius: radius.md,
    minHeight: 52,
  },
  btnHalf: {
    flex: 1,
  },
  btnPrimary: { backgroundColor: colors.admin },
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
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btnGhost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink300,
  },
  btnGhostText: {
    color: colors.ink700,
    fontSize: 14,
    fontWeight: '600',
  },
});