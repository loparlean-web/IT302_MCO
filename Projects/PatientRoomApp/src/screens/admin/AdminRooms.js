// src/screens/admin/AdminRooms.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { colors, spacing, radius, shadow, type, iconSize } from '../../theme';

export default function AdminRooms({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number', { ascending: true });
      if (error) throw error;

      setRooms(
        (data || []).map((r) => ({
          ...r,
          number: r.room_number,
          price: Number(r.price),
        }))
      );
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

  const changeStatus = (room) => {
    Alert.alert(`Room ${room.number}`, 'Set status to:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Available',
        onPress: () => updateStatus(room.id, 'available'),
      },
      {
        text: 'Reserved',
        onPress: () => updateStatus(room.id, 'reserved'),
      },
      {
        text: 'Occupied',
        onPress: () => updateStatus(room.id, 'occupied'),
      },
    ]);
  };

  const updateStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      await load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const roomActions = (room) => {
    Alert.alert(
      `Room ${room.number}`,
      `${room.type} · ₱${room.price.toLocaleString()} / day\nStatus: ${
        room.status.charAt(0).toUpperCase() + room.status.slice(1)
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit room',
          onPress: () =>
            navigation.navigate('AdminEditRoom', { roomId: room.id }),
        },
        {
          text: 'Change status',
          onPress: () => changeStatus(room),
        },
      ]
    );
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
        data={rooms}
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
            <View>
              <Text style={type.title}>Rooms</Text>
              <Text style={s.subtitle}>
                {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} total
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Feather name="grid" size={iconSize.hero} color={colors.ink300} />
            </View>
            <Text style={s.emptyTitle}>No rooms yet</Text>
            <Text style={s.emptyText}>
              Add rooms from the Supabase dashboard to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RoomCard item={item} onPress={() => roomActions(item)} />
        )}
      />
    </View>
  );
}

// ─────────── Room Card ───────────

const RoomCard = ({ item, onPress }) => (
  <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
    {/* Room number + type block */}
    <View style={s.cardMain}>
      <View style={s.cardTopRow}>
        <Text style={s.roomNumber}>{item.number}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={s.roomType}>{item.type}</Text>
      <View style={s.priceRow}>
        <Text style={s.price}>₱{item.price.toLocaleString()}</Text>
        <Text style={s.priceUnit}> / day</Text>
      </View>
    </View>

    {/* Right: chevron affordance */}
    <Feather name="chevron-right" size={20} color={colors.ink300} />
  </TouchableOpacity>
);

// ─────────── Status Badge ───────────

const StatusBadge = ({ status }) => {
  const map = {
    available: { bg: colors.successSoft, fg: colors.success, label: 'Available' },
    reserved: { bg: colors.warningSoft, fg: colors.warning, label: 'Reserved' },
    occupied: { bg: colors.dangerSoft, fg: colors.danger, label: 'Occupied' },
    maintenance: { bg: colors.ink100, fg: colors.ink700, label: 'Maintenance' },
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
  cardMain: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  roomNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.3,
  },
  roomType: {
    ...type.caption,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink900,
  },
  priceUnit: {
    fontSize: 12,
    color: colors.ink500,
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