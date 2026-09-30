// src/screens/MyRoom.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, shadow, type, iconSize } from '../theme';

export default function MyRoom({ navigation }) {
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

      if (!resvData) {
        setInfo(null);
        setLoading(false);
        return;
      }

      const { data: paymentsData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id);
      if (payError) throw payError;

      const room = resvData.room;
      const checkIn = new Date(resvData.created_at);
      const days = Math.max(
        1,
        Math.ceil((Date.now() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      );
      const dailyRate = Number(room.price);
      const total = dailyRate * days;

      const paid = (paymentsData || [])
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const balance = Math.max(0, total - paid);

      setInfo({
        reservation: {
          id: resvData.id,
          checkIn,
          room: {
            ...room,
            number: room.room_number,
            price: dailyRate,
          },
        },
        total,
        paid,
        balance,
        canCheckout: balance <= 0,
      });
    } catch (e) {
      console.warn('MyRoom load:', e.message);
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

  const goToBill = () => navigation.navigate('Bill');

  const handleCheckout = () => {
    if (!info) return;

    if (!info.canCheckout) {
      return Alert.alert(
        'Cannot discharge yet',
        `You still have ₱${info.balance.toLocaleString()} outstanding. Please settle your bill first.`,
        [
          { text: 'OK' },
          { text: 'Go to Bill', onPress: goToBill },
        ]
      );
    }

    Alert.alert(
      'Confirm discharge',
      `Check out from Room ${info.reservation.room.number}? Your bill is fully paid — this will end your stay.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check out',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const { error: resvError } = await supabase
                .from('reservations')
                .update({ status: 'completed' })
                .eq('id', info.reservation.id);
              if (resvError) throw resvError;

              const { error: roomError } = await supabase
                .from('rooms')
                .update({ status: 'available' })
                .eq('id', info.reservation.room.id);
              if (roomError) throw roomError;

              const roomNumber = info.reservation.room.number;
              await load().catch(() => {});

              Alert.alert(
                'Discharged',
                `You have checked out from Room ${roomNumber}. Thank you and get well soon.`,
                [{ text: 'OK' }]
              );
            } catch (e) {
              Alert.alert('Cannot check out', e.message);
            }
            setBusy(false);
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel reservation',
      `Cancel your reservation for Room ${info.reservation.room.number}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const { error: resvError } = await supabase
                .from('reservations')
                .update({ status: 'cancelled' })
                .eq('id', info.reservation.id);
              if (resvError) throw resvError;

              const { error: roomError } = await supabase
                .from('rooms')
                .update({ status: 'available' })
                .eq('id', info.reservation.room.id);
              if (roomError) throw roomError;

              await load().catch(() => {});
              Alert.alert('Cancelled', 'Your reservation has been cancelled.');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
            setBusy(false);
          },
        },
      ]
    );
  };

  // ─────────── LOADING ───────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.patient} />
      </View>
    );
  }

  // ─────────── EMPTY STATE ───────────
  if (!info || !info.reservation) {
    return (
      <ScrollView
        contentContainerStyle={s.emptyScreen}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.patient}
          />
        }
      >
        <View style={s.emptyIconWrap}>
          <Feather name="home" size={iconSize.hero} color={colors.ink300} />
        </View>
        <Text style={s.emptyTitle}>No active stay</Text>
        <Text style={s.emptyText}>
          You don't have an active room reservation yet.
        </Text>

        <TouchableOpacity
          style={[s.btn, s.btnPrimary]}
          onPress={() => navigation.navigate('Rooms')}
          activeOpacity={0.8}
        >
          <Feather name="search" size={iconSize.ui} color={colors.white} />
          <Text style={s.btnPrimaryText}>Browse rooms</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const { reservation, balance, total, paid, canCheckout } = info;
  const days = Math.max(
    1,
    Math.ceil(
      (Date.now() - reservation.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

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
      {/* ─────── Hero ─────── */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.overline}>ACTIVE STAY</Text>
          <View style={s.activeDot} />
        </View>
        <Text style={s.heroNumber}>{reservation.room.number}</Text>
        <Text style={s.heroType}>{reservation.room.type}</Text>

        <View style={s.heroDivider} />

        <View style={s.heroMeta}>
          <Meta
            icon="calendar"
            label="Checked in"
            value={reservation.checkIn.toLocaleDateString()}
          />
          <Meta
            icon="clock"
            label="Days"
            value={String(days)}
          />
          <Meta
            icon="tag"
            label="Rate"
            value={`₱${reservation.room.price.toLocaleString()}`}
          />
        </View>
      </View>

      {/* ─────── Bill Summary ─────── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Bill summary</Text>

        <Row label="Room charges" value={`₱${total.toLocaleString()}`} />
        <Row
          label="Amount paid"
          value={`₱${paid.toLocaleString()}`}
          valueColor={colors.success}
        />

        <View style={s.divider} />

        <View style={s.balanceRow}>
          <Text style={s.balanceLabel}>Balance</Text>
          <Text
            style={[
              s.balanceValue,
              { color: balance > 0 ? colors.danger : colors.success },
            ]}
          >
            ₱{balance.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ─────── Status Banner ─────── */}
      {canCheckout ? (
        <View style={[s.banner, s.bannerSuccess]}>
          <Feather
            name="check-circle"
            size={iconSize.ui}
            color={colors.success}
          />
          <Text style={[s.bannerText, { color: colors.success }]}>
            Your bill is fully paid. You may proceed to discharge.
          </Text>
        </View>
      ) : (
        <View style={[s.banner, s.bannerDanger]}>
          <Feather
            name="alert-circle"
            size={iconSize.ui}
            color={colors.danger}
          />
          <Text style={[s.bannerText, { color: colors.danger }]}>
            Settle your outstanding balance to check out.
          </Text>
        </View>
      )}

      {/* ─────── Primary Action ─────── */}
      {canCheckout ? (
        <TouchableOpacity
          style={[s.btn, s.btnPrimary, busy && s.btnBusy]}
          onPress={handleCheckout}
          disabled={busy}
          activeOpacity={0.8}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Feather name="log-out" size={iconSize.ui} color={colors.white} />
              <Text style={s.btnPrimaryText}>Discharge / Check out</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[s.btn, s.btnPrimary, busy && s.btnBusy]}
          onPress={goToBill}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Feather name="credit-card" size={iconSize.ui} color={colors.white} />
          <Text style={s.btnPrimaryText}>Pay balance</Text>
        </TouchableOpacity>
      )}

      {/* ─────── Secondary Actions ─────── */}
      {!canCheckout && (
        <TouchableOpacity
          style={[s.btn, s.btnGhost, busy && s.btnBusy]}
          onPress={handleCancel}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Feather name="x" size={iconSize.ui} color={colors.danger} />
          <Text style={s.btnGhostTextDanger}>Cancel reservation</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─────────── Small Components ───────────

const Meta = ({ icon, label, value }) => (
  <View style={s.metaItem}>
    <Feather name={icon} size={14} color={colors.ink500} />
    <Text style={s.metaLabel}>{label}</Text>
    <Text style={s.metaValue}>{value}</Text>
  </View>
);

const Row = ({ label, value, valueColor }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={[s.rowValue, valueColor && { color: valueColor }]}>
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

  // ── Empty ──
  emptyScreen: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.ink50,
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.ink100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...type.heading,
  },
  emptyText: {
    ...type.caption,
    textAlign: 'center',
    marginBottom: spacing.md,
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
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  heroNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -1,
    marginTop: spacing.sm,
  },
  heroType: {
    ...type.caption,
    marginTop: spacing.xs,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.ink100,
    marginVertical: spacing.base,
  },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
    gap: spacing.xs,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.ink500,
    marginTop: spacing.xs,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink900,
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
    fontWeight: '600',
    color: colors.ink900,
  },
  divider: {
    height: 1,
    backgroundColor: colors.ink100,
    marginVertical: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink700,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // ── Banners ──
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.md,
  },
  bannerSuccess: { backgroundColor: colors.successSoft },
  bannerDanger: { backgroundColor: colors.dangerSoft },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
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
  btnPrimary: { backgroundColor: colors.patient },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.ink300,
  },
  btnBusy: { opacity: 0.7 },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  btnGhostTextDanger: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
});