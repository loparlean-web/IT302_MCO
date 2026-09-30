// src/screens/Bill.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, shadow, type, iconSize } from '../theme';

export default function Bill({ navigation }) {
  const { user } = useAuth();
  const [bill, setBill] = useState({
    roomCharges: 0,
    services: 0,
    total: 0,
    paid: 0,
  });
  const [payments, setPayments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data: resvData, error: resvError } = await supabase
        .from('reservations')
        .select('*, room:rooms(*)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (resvError) throw resvError;

      const { data: paymentsData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (payError) throw payError;

      const list = paymentsData || [];
      setPayments(list);

      let roomCharges = 0;
      if (resvData?.room) {
        const checkIn = new Date(resvData.created_at);
        const days = Math.max(
          1,
          Math.ceil((Date.now() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        );
        roomCharges = Number(resvData.room.price) * days;
      }

      const services = 0;
      const total = roomCharges + services;
      const paid = list
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      setBill({ roomCharges, services, total, paid });
    } catch (e) {
      console.warn('Bill load:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const balance = Math.max(0, bill.total - bill.paid);
  const isFullyPaid = balance <= 0 && bill.total > 0;
  const isPartiallyPaid = bill.paid > 0 && balance > 0;

  const goToPayment = () => {
    if (isFullyPaid || balance <= 0) return;
    navigation.navigate('Payment', { balance });
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.patient} />
      </View>
    );
  }

  const status = isFullyPaid
    ? { bg: colors.successSoft, fg: colors.success, label: 'Paid' }
    : isPartiallyPaid
    ? { bg: colors.warningSoft, fg: colors.warning, label: 'Partial' }
    : { bg: colors.dangerSoft, fg: colors.danger, label: 'Unpaid' };

  return (
    <ScrollView
      contentContainerStyle={s.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.patient}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ─────── Hero: Balance ─────── */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.overline}>OUTSTANDING BALANCE</Text>
          <View style={[s.badge, { backgroundColor: status.bg }]}>
            <Text style={[s.badgeLabel, { color: status.fg }]}>
              {status.label}
            </Text>
          </View>
        </View>
        <Text
          style={[
            s.heroAmount,
            { color: balance > 0 ? colors.ink900 : colors.success },
          ]}
        >
          ₱{balance.toLocaleString()}
        </Text>
        {isFullyPaid && (
          <Text style={s.heroSub}>Fully settled — thank you</Text>
        )}
        {isPartiallyPaid && (
          <Text style={s.heroSub}>
            ₱{bill.paid.toLocaleString()} of ₱{bill.total.toLocaleString()} paid
          </Text>
        )}
        {!isFullyPaid && !isPartiallyPaid && bill.total > 0 && (
          <Text style={s.heroSub}>Payment not yet started</Text>
        )}
      </View>

      {/* ─────── Breakdown ─────── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Breakdown</Text>

        <Row label="Room charges" value={`₱${bill.roomCharges.toLocaleString()}`} />
        {bill.services > 0 && (
          <Row label="Services" value={`₱${bill.services.toLocaleString()}`} />
        )}

        <View style={s.divider} />

        <Row
          label="Total"
          value={`₱${bill.total.toLocaleString()}`}
          valueWeight="600"
        />
        <Row
          label="Paid"
          value={`₱${bill.paid.toLocaleString()}`}
          valueColor={colors.success}
        />
      </View>

      {/* ─────── Primary action ─────── */}
      {!isFullyPaid && (
        <TouchableOpacity
          style={[s.btn, s.btnPrimary]}
          onPress={goToPayment}
          activeOpacity={0.8}
        >
          <Feather name="credit-card" size={iconSize.ui} color={colors.white} />
          <Text style={s.btnPrimaryText}>Make payment</Text>
        </TouchableOpacity>
      )}

      {isFullyPaid && (
        <View style={[s.btn, s.btnDisabled]}>
          <Feather name="check" size={iconSize.ui} color={colors.success} />
          <Text style={s.btnDisabledText}>Fully paid</Text>
        </View>
      )}

      {/* ─────── History link ─────── */}
      <TouchableOpacity
        style={[s.btn, s.btnGhost]}
        onPress={() => navigation.navigate('History')}
        activeOpacity={0.7}
      >
        <Feather name="list" size={iconSize.ui} color={colors.ink700} />
        <Text style={s.btnGhostText}>
          Payment history
          {payments.length > 0 ? `  ·  ${payments.length}` : ''}
        </Text>
        <Feather name="chevron-right" size={iconSize.ui} color={colors.ink500} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────── Components ───────────

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
  },

  // ── Hero ──
  hero: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  overline: {
    ...type.overline,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  heroSub: {
    ...type.caption,
    marginTop: spacing.sm,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardTitle: {
    ...type.overline,
    marginBottom: spacing.md,
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
    fontWeight: '500',
    color: colors.ink900,
  },
  divider: {
    height: 1,
    backgroundColor: colors.ink100,
    marginVertical: spacing.sm,
  },

  // ── Badge ──
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Buttons ──
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    minHeight: 52,
  },
  btnPrimary: { backgroundColor: colors.patient },
  btnDisabled: { backgroundColor: colors.successSoft },
  btnGhost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink300,
    justifyContent: 'space-between',
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabledText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '600',
  },
  btnGhostText: {
    flex: 1,
    textAlign: 'left',
    marginLeft: spacing.sm,
    color: colors.ink900,
    fontSize: 15,
    fontWeight: '600',
  },
});