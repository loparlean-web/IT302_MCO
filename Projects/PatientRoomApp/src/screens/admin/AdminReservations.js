// src/screens/admin/AdminReservations.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { colors, spacing, radius, shadow, type, iconSize } from '../../theme';

export default function AdminReservations() {
  const [tab, setTab] = useState('reservations');
  const [reservations, setReservations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [resvRes, payRes] = await Promise.all([
        supabase
          .from('reservations')
          .select(`
            *,
            profile:profiles (username, full_name),
            room:rooms (room_number)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select(`
            *,
            profile:profiles (username, full_name)
          `)
          .order('created_at', { ascending: false }),
      ]);

      if (resvRes.error) throw resvRes.error;
      if (payRes.error) throw payRes.error;

      setReservations(
        (resvRes.data || []).map((r) => ({
          ...r,
          user: r.profile?.full_name || r.profile?.username || 'Unknown',
          room: r.room?.room_number || '?',
          checkIn: new Date(r.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        }))
      );

      setPayments(
        (payRes.data || []).map((p) => ({
          ...p,
          userName: p.profile?.full_name || p.profile?.username || 'Unknown',
          amount: Number(p.amount),
          timestamp: p.created_at,
        }))
      );
    } catch (e) {
      console.warn('AdminReservations load:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.admin} />
      </View>
    );
  }

  const list = tab === 'reservations' ? reservations : payments;

  return (
    <View style={s.screen}>
      {/* ─────── Title + Tabs ─────── */}
      <View style={s.header}>
        <Text style={type.title}>Activity</Text>
        <Text style={s.subtitle}>
          {reservations.length} reservations · {payments.length} payments
        </Text>
      </View>

      <View style={s.tabs}>
        <TabButton
          label="Reservations"
          count={reservations.length}
          active={tab === 'reservations'}
          onPress={() => setTab('reservations')}
        />
        <TabButton
          label="Payments"
          count={payments.length}
          active={tab === 'payments'}
          onPress={() => setTab('payments')}
        />
      </View>

      {/* ─────── List ─────── */}
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.admin}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Feather
                name={tab === 'reservations' ? 'clipboard' : 'credit-card'}
                size={iconSize.hero}
                color={colors.ink300}
              />
            </View>
            <Text style={s.emptyTitle}>
              No {tab === 'reservations' ? 'reservations' : 'payments'} yet
            </Text>
            <Text style={s.emptyText}>
              {tab === 'reservations'
                ? 'New room bookings will appear here.'
                : 'Payment transactions will appear here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) =>
          tab === 'reservations' ? (
            <ReservationRow item={item} />
          ) : (
            <PaymentRow item={item} />
          )
        }
      />
    </View>
  );
}

// ─────────── Tab Button ───────────

const TabButton = ({ label, count, active, onPress }) => (
  <TouchableOpacity
    style={[s.tab, active && s.tabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[s.tabLabel, active && s.tabLabelActive]}>{label}</Text>
    <View style={[s.tabCount, active && s.tabCountActive]}>
      <Text style={[s.tabCountText, active && s.tabCountTextActive]}>
        {count}
      </Text>
    </View>
  </TouchableOpacity>
);

// ─────────── Reservation Row ───────────

const ReservationRow = ({ item }) => {
  const statusCfg = getReservationStatus(item.status);
  return (
    <View style={s.card}>
      {/* Icon */}
      <View
        style={[s.iconWrap, { backgroundColor: statusCfg.bg }]}
      >
        <Feather name="clipboard" size={18} color={statusCfg.fg} />
      </View>

      {/* Details */}
      <View style={s.details}>
        <Text style={s.primaryText} numberOfLines={1}>
          {item.user}
        </Text>
        <View style={s.metaRow}>
          <Feather name="grid" size={11} color={colors.ink500} />
          <Text style={s.metaText}>Room {item.room}</Text>
        </View>
        <View style={s.metaRow}>
          <Feather name="calendar" size={11} color={colors.ink500} />
          <Text style={s.metaText}>{item.checkIn}</Text>
        </View>
      </View>

      {/* Status */}
      <View style={s.right}>
        <View style={[s.badge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[s.badgeLabel, { color: statusCfg.fg }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─────────── Payment Row ───────────

const PaymentRow = ({ item }) => {
  const isPaid = item.status === 'paid';
  const date = new Date(item.timestamp);
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={s.card}>
      {/* Method icon */}
      <View
        style={[
          s.iconWrap,
          { backgroundColor: isPaid ? colors.successSoft : colors.dangerSoft },
        ]}
      >
        <Feather
          name={methodIcon(item.method)}
          size={18}
          color={isPaid ? colors.success : colors.danger}
        />
      </View>

      {/* Details */}
      <View style={s.details}>
        <Text style={s.primaryText} numberOfLines={1}>
          {item.userName}
        </Text>
        <View style={s.metaRow}>
          <Feather name="credit-card" size={11} color={colors.ink500} />
          <Text style={s.metaText}>{item.method || 'Payment'}</Text>
        </View>
        <View style={s.metaRow}>
          <Feather name="clock" size={11} color={colors.ink500} />
          <Text style={s.metaText}>
            {dateStr} · {timeStr}
          </Text>
        </View>
      </View>

      {/* Amount + status */}
      <View style={s.right}>
        <Text style={s.amount}>₱{item.amount.toLocaleString()}</Text>
        <View
          style={[
            s.badge,
            { backgroundColor: isPaid ? colors.successSoft : colors.dangerSoft },
          ]}
        >
          <Text
            style={[
              s.badgeLabel,
              { color: isPaid ? colors.success : colors.danger },
            ]}
          >
            {isPaid ? 'Paid' : (item.status || '').toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─────────── Helpers ───────────

const getReservationStatus = (status) => {
  switch (status) {
    case 'active':
      return { bg: colors.successSoft, fg: colors.success, label: 'Active' };
    case 'pending':
      return { bg: colors.infoSoft, fg: colors.info, label: 'Pending' };
    case 'completed':
      return { bg: colors.ink100, fg: colors.ink700, label: 'Completed' };
    case 'cancelled':
      return { bg: colors.dangerSoft, fg: colors.danger, label: 'Cancelled' };
    default:
      return { bg: colors.ink100, fg: colors.ink700, label: status };
  }
};

const methodIcon = (method) => {
  if (!method) return 'credit-card';
  const m = method.toLowerCase();
  if (m.includes('nfc')) return 'wifi';
  if (m.includes('card')) return 'credit-card';
  if (m.includes('cash')) return 'dollar-sign';
  return 'credit-card';
};

// ─────────── Styles ───────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink50,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ink50,
  },

  // ── Header ──
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  subtitle: {
    ...type.caption,
    marginTop: spacing.xs,
  },

  // ── Tabs ──
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
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
  },
  tabActive: {
    borderColor: colors.admin,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink700,
  },
  tabLabelActive: {
    color: colors.admin,
  },
  tabCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountActive: {
    backgroundColor: colors.adminSoft,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink500,
  },
  tabCountTextActive: {
    color: colors.admin,
  },

  // ── List ──
  list: {
    paddingHorizontal: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  // ── Card ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    padding: spacing.base,
    borderRadius: radius.md,
    ...shadow.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    gap: 3,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink900,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 12,
    color: colors.ink500,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.2,
  },

  // ── Badge ──
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Empty ──
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
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
    paddingHorizontal: spacing.lg,
  },
});