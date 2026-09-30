// src/screens/admin/AdminUsers.js
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
import { supabase } from '../../supabase';
import { colors, spacing, radius, shadow, type, iconSize } from '../../theme';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });
      if (error) throw error;

      setUsers(
        (data || []).map((u) => ({
          ...u,
          name: u.full_name || u.username || 'Patient',
        }))
      );
    } catch (e) {
      console.warn('AdminUsers load:', e.message);
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

  return (
    <View style={s.screen}>
      <FlatList
        data={users}
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
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={type.title}>Patients</Text>
            <Text style={s.subtitle}>
              {users.length} {users.length === 1 ? 'patient' : 'patients'}{' '}
              registered
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Feather name="users" size={iconSize.hero} color={colors.ink300} />
            </View>
            <Text style={s.emptyTitle}>No patients yet</Text>
            <Text style={s.emptyText}>
              Patients who create an account will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => <UserCard item={item} />}
      />
    </View>
  );
}

// ─────────── User Card ───────────

const UserCard = ({ item }) => {
  const initial = item.name[0]?.toUpperCase() || 'P';
  // Deterministic soft color from name (keeps avatars varied but calm)
  const avatarBg = pickAvatarColor(item.id);

  // Build contact line only with what exists
  const contactParts = [];
  if (item.phone) contactParts.push(item.phone);
  if (item.age) contactParts.push(`${item.age} yrs`);
  if (item.blood_type) contactParts.push(item.blood_type);

  return (
    <View style={s.card}>
      {/* Avatar */}
      <View style={[s.avatar, { backgroundColor: avatarBg }]}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>

      {/* Details */}
      <View style={s.details}>
        <Text style={s.name} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={s.metaRow}>
          <Feather name="at-sign" size={11} color={colors.ink500} />
          <Text style={s.metaText} numberOfLines={1}>
            {item.username}
          </Text>
        </View>
        {contactParts.length > 0 && (
          <View style={s.metaRow}>
            <Feather name="phone" size={11} color={colors.ink500} />
            <Text style={s.metaText} numberOfLines={1}>
              {contactParts.join('  ·  ')}
            </Text>
          </View>
        )}
      </View>

      {/* Chevron (visual, not yet tappable) */}
      <Feather name="chevron-right" size={18} color={colors.ink300} />
    </View>
  );
};

// Deterministic soft color from UUID — stays calm, never saturated
const pickAvatarColor = (id = '') => {
  const palette = [
    '#E0F2FE', // sky soft
    '#DCFCE7', // green soft
    '#FEF3C7', // amber soft
    '#FCE7F3', // pink soft
    '#F3E8FF', // lilac soft
    '#E0E7FF', // indigo soft
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
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
  subtitle: {
    ...type.caption,
    marginTop: spacing.xs,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink900,
  },
  details: {
    flex: 1,
    gap: 3,
  },
  name: {
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
    flexShrink: 1,
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