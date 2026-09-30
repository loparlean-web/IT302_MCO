// src/screens/admin/AdminDashboard.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { useAuth } from '../../AuthContext';
import { colors, spacing, radius, shadow, type, iconSize } from '../../theme';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [patientsRes, roomsRes, activeResvRes, paymentsRes, revenueRes] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'patient'),
          supabase.from('rooms').select('status'),
          supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'active']),
          supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'paid'),
          supabase.from('payments').select('amount').eq('status', 'paid'),
        ]);

      if (patientsRes.error) throw patientsRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (activeResvRes.error) throw activeResvRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (revenueRes.error) throw revenueRes.error;

      const rooms = roomsRes.data || [];
      const revenue = (revenueRes.data || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      setStats({
        totalUsers: patientsRes.count || 0,
        totalRooms: rooms.length,
        availableRooms: rooms.filter((r) => r.status === 'available').length,
        reservedRooms: rooms.filter((r) => r.status === 'reserved').length,
        occupiedRooms: rooms.filter((r) => r.status === 'occupied').length,
        activeReservations: activeResvRes.count || 0,
        totalPayments: paymentsRes.count || 0,
        totalRevenue: revenue,
      });
    } catch (e) {
      Alert.alert('Error', e.message);
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

  const handleLogout = () => {
    Alert.alert('Log out', 'End admin session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (loading || !stats) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.admin} />
      </View>
    );
  }

  const displayName =
    user?.full_name || user?.name || user?.username || 'Admin';

  const occupancyRate =
    stats.totalRooms > 0
      ? Math.round(
          ((stats.reservedRooms + stats.occupiedRooms) / stats.totalRooms) * 100
        )
      : 0;

  return (
    <ScrollView
      contentContainerStyle={s.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.admin}
        />
      }
    >
      {/* ─────── Greeting Header ─────── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.overline}>ADMIN</Text>
          <Text style={s.greeting}>{displayName}</Text>
        </View>
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color={colors.ink700} />
        </TouchableOpacity>
      </View>

      {/* ─────── Revenue Hero ─────── */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Feather name="trending-up" size={18} color={colors.admin} />
          <Text style={s.heroOverline}>TOTAL COLLECTED</Text>
        </View>
        <Text style={s.heroAmount}>
          ₱{stats.totalRevenue.toLocaleString()}
        </Text>
        <Text style={s.heroSub}>
          {stats.totalPayments}{' '}
          {stats.totalPayments === 1 ? 'payment' : 'payments'} received
        </Text>
      </View>

      {/* ─────── Stat Grid ─────── */}
      <Text style={s.sectionTitle}>Overview</Text>
      <View style={s.grid}>
        <StatCard
          icon="users"
          label="Patients"
          value={stats.totalUsers}
        />
        <StatCard
          icon="grid"
          label="Rooms"
          value={stats.totalRooms}
        />
        <StatCard
          icon="clipboard"
          label="Active stays"
          value={stats.activeReservations}
        />
        <StatCard
          icon="credit-card"
          label="Payments"
          value={stats.totalPayments}
        />
      </View>

      {/* ─────── Room Status ─────── */}
      <Text style={s.sectionTitle}>Room status</Text>
      <View style={s.card}>
        {/* Occupancy header */}
        <View style={s.occupancyRow}>
          <Text style={s.occupancyLabel}>Occupancy</Text>
          <Text style={s.occupancyValue}>{occupancyRate}%</Text>
        </View>

        {/* Proportional bar */}
        {stats.totalRooms > 0 && (
          <View style={s.bar}>
            {stats.availableRooms > 0 && (
              <View
                style={[
                  s.barSegment,
                  {
                    flex: stats.availableRooms,
                    backgroundColor: colors.success,
                  },
                ]}
              />
            )}
            {stats.reservedRooms > 0 && (
              <View
                style={[
                  s.barSegment,
                  {
                    flex: stats.reservedRooms,
                    backgroundColor: colors.warning,
                  },
                ]}
              />
            )}
            {stats.occupiedRooms > 0 && (
              <View
                style={[
                  s.barSegment,
                  {
                    flex: stats.occupiedRooms,
                    backgroundColor: colors.danger,
                  },
                ]}
              />
            )}
          </View>
        )}

        <View style={s.divider} />

        <StatusRow
          color={colors.success}
          label="Available"
          value={stats.availableRooms}
        />
        <StatusRow
          color={colors.warning}
          label="Reserved"
          value={stats.reservedRooms}
        />
        <StatusRow
          color={colors.danger}
          label="Occupied"
          value={stats.occupiedRooms}
          isLast
        />
      </View>
    </ScrollView>
  );
}

// ─────────── Stat Card ───────────

const StatCard = ({ icon, label, value }) => (
  <View style={s.statCard}>
    <View style={s.statIconWrap}>
      <Feather name={icon} size={16} color={colors.ink700} />
    </View>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

// ─────────── Status Row ───────────

const StatusRow = ({ color, label, value, isLast }) => (
  <View style={[s.statusRow, isLast && s.statusRowLast]}>
    <View style={[s.statusDot, { backgroundColor: color }]} />
    <Text style={s.statusLabel}>{label}</Text>
    <Text style={s.statusValue}>{value}</Text>
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  overline: {
    ...type.overline,
    color: colors.admin,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.ink900,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.card,
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
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroOverline: {
    ...type.overline,
    color: colors.admin,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -1,
  },
  heroSub: {
    ...type.caption,
    marginTop: spacing.xs,
  },

  // ── Section ──
  sectionTitle: {
    ...type.overline,
    marginTop: spacing.sm,
  },

  // ── Stat grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.base,
    ...shadow.card,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.ink100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.5,
  },
  statLabel: {
    ...type.caption,
    marginTop: 2,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },

  // ── Occupancy ──
  occupancyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  occupancyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink700,
  },
  occupancyValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.3,
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.ink100,
  },
  barSegment: {
    height: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: colors.ink100,
    marginVertical: spacing.md,
  },

  // ── Status Row ──
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  statusRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.ink700,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink900,
  },
});