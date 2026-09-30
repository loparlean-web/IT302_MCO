import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import {
  colors,
  spacing,
  radius,
  shadow,
  type,
  iconSize,
} from '../theme';

export default function RoomList({ navigation }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [reservation, setReservation] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number', { ascending: true });

      if (roomsError) throw roomsError;

      setRooms(
        (roomsData || []).map((r) => ({
          ...r,
          number: r.room_number,
          price: Number(r.price),
        }))
      );

      const { data: resvData, error: resvError } = await supabase
        .from('reservations')
        .select('*, room:rooms(*)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resvError) throw resvError;

      setReservation(
        resvData
          ? {
              ...resvData,
              room: {
                ...resvData.room,
                number: resvData.room.room_number,
                price: Number(resvData.room.price),
              },
            }
          : null
      );
    } catch (e) {
      console.warn('RoomList:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = rooms.filter(
    (r) => filter === 'all' || r.type.toLowerCase() === filter
  );

  // ─────────── LOADING ───────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.patient} />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <Text style={type.title}>Rooms</Text>
        <Text style={s.count}>{rooms.length} total</Text>
      </View>

      {/* Filters */}
      <View style={s.filters}>
        {['all', 'private', 'semi-private'].map((f) => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[s.chipLabel, active && s.chipLabelActive]}>
                {f === 'all' ? 'All' : f === 'private' ? 'Private' : 'Semi-Private'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active reservation banner */}
      {reservation && (
        <TouchableOpacity
          style={s.banner}
          onPress={() => navigation.navigate('MyRoom')}
          activeOpacity={0.8}
        >
          <Feather
            name="check-circle"
            size={iconSize.ui}
            color={colors.patient}
          />
          <Text style={s.bannerText}>
            Room {reservation.room.number} is reserved
          </Text>
          <Feather
            name="chevron-right"
            size={iconSize.ui}
            color={colors.patient}
          />
        </TouchableOpacity>
      )}

      {/* Room list */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather
              name="inbox"
              size={iconSize.hero}
              color={colors.ink300}
            />
            <Text style={s.emptyTitle}>No rooms found</Text>
            <Text style={s.emptyText}>
              Try a different filter.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMine = reservation?.room?.id === item.id;
          return (
            <TouchableOpacity
              style={[s.card, isMine && s.cardMine]}
              onPress={() =>
                navigation.navigate('RoomDetails', { roomId: item.id })
              }
              activeOpacity={0.7}
            >
              <View style={s.cardMain}>
                <View style={s.cardRow}>
                  <Text style={s.roomNumber}>{item.number}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={s.roomType}>{item.type}</Text>
                <View style={s.priceRow}>
                  <Text style={s.price}>₱{item.price.toLocaleString()}</Text>
                  <Text style={s.priceUnit}> / day</Text>
                </View>
              </View>
              {isMine && (
                <View style={s.mineMarker}>
                  <Feather
                    name="star"
                    size={12}
                    color={colors.patient}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ─────────── Status Badge ───────────
const StatusBadge = ({ status }) => {
  const map = {
    available: { bg: colors.successSoft, fg: colors.success, label: 'Available' },
    reserved:  { bg: colors.warningSoft, fg: colors.warning, label: 'Reserved' },
    occupied:  { bg: colors.dangerSoft,  fg: colors.danger,  label: 'Occupied' },
  };
  const cfg = map[status] || map.available;
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeLabel, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  count: {
    ...type.caption,
  },

  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.ink100,
  },
  chipActive: {
    backgroundColor: colors.patient,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink700,
  },
  chipLabelActive: {
    color: colors.white,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.patientSoft,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.patientInk,
  },

  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.base,
    ...shadow.card,
  },
  cardMine: {
    borderLeftWidth: 4,
    borderLeftColor: colors.patient,
  },
  cardMain: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  roomNumber: {
    ...type.heading,
    fontSize: 20,
  },
  roomType: {
    ...type.caption,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink900,
  },
  priceUnit: {
    fontSize: 13,
    color: colors.ink500,
  },
  mineMarker: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },

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

  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...type.heading,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...type.caption,
  },
});