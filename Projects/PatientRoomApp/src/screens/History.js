// src/screens/History.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, shadow, type, iconSize } from '../theme';

export default function History() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayments(data || []);
    } catch (e) {
      console.warn('History load:', e.message);
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

  // ─────────── LOADING ───────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.patient} />
      </View>
    );
  }

  // ─────────── EMPTY ───────────
  if (payments.length === 0) {
    return (
      <View style={s.emptyScreen}>
        <View style={s.emptyIconWrap}>
          <Feather name="file-text" size={iconSize.hero} color={colors.ink300} />
        </View>
        <Text style={s.emptyTitle}>No payments yet</Text>
        <Text style={s.emptyText}>
          Your payment transactions will appear here.
        </Text>
      </View>
    );
  }

  // ─────────── LIST ───────────
  return (
    <View style={s.screen}>
      <FlatList
        data={payments}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.patient}
          />
        }
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={type.title}>Payment history</Text>
            <Text style={s.count}>
              {payments.length} {payments.length === 1 ? 'transaction' : 'transactions'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PaymentRow item={item} />
        )}
      />
    </View>
  );
}

// ─────────── Row Component ───────────

const PaymentRow = ({ item }) => {
  const isPaid = item.status === 'paid';
  const date = new Date(item.created_at);
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={s.card}>
      {/* Left: method icon */}
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

      {/* Middle: details */}
      <View style={s.details}>
        <Text style={s.method}>
          {item.method || 'Payment'}
        </Text>
        <Text style={s.meta}>
          {dateStr}  ·  {timeStr}
        </Text>
        <Text style={s.txn}>
          #{item.id.slice(0, 8).toUpperCase()}
        </Text>
      </View>

      {/* Right: amount + status */}
      <View style={s.right}>
        <Text style={s.amount}>
          ₱{Number(item.amount).toLocaleString()}
        </Text>
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

// Map method → Feather icon
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
  list: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  // ── Header ──
  header: {
    marginBottom: spacing.sm,
  },
  count: {
    ...type.caption,
    marginTop: spacing.xs,
  },

  // ── Empty ──
  emptyScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.ink50,
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
    gap: 2,
  },
  method: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink900,
  },
  meta: {
    ...type.caption,
    fontSize: 12,
  },
  txn: {
    fontSize: 11,
    color: colors.ink500,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});