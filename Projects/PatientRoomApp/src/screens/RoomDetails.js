// src/screens/RoomDetails.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, shadow, type, iconSize } from '../theme';

export default function RoomDetails({ route, navigation }) {
  const { roomId } = route.params;
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (roomError) throw roomError;

      const { data: resvData, error: resvError } = await supabase
        .from('reservations')
        .select('*, room:rooms(*)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (resvError) throw resvError;

      setRoom({
        ...roomData,
        number: roomData.room_number,
        price: Number(roomData.price),
      });

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
      console.warn('RoomDetails load:', e.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleReserve = () => {
    if (reservation) {
      return Alert.alert(
        'Active reservation exists',
        `You already have Room ${reservation.room.number} reserved.`,
        [
          { text: 'OK' },
          {
            text: 'View my room',
            onPress: () => navigation.navigate('Main', { screen: 'MyRoom' }),
          },
        ]
      );
    }

    Alert.alert(
      'Reserve room',
      `Reserve Room ${room.number} (${room.type}) for ₱${room.price.toLocaleString()} per day?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reserve',
          onPress: async () => {
            setBusy(true);
            try {
              const { error: resvError } = await supabase
                .from('reservations')
                .insert([
                  { user_id: user.id, room_id: room.id, status: 'pending' },
                ]);
              if (resvError) throw resvError;

              const { error: roomError } = await supabase
                .from('rooms')
                .update({ status: 'reserved' })
                .eq('id', room.id);
              if (roomError) throw roomError;

              await load().catch(() => {});
              Alert.alert('Reserved', `Room ${room.number} is now yours.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
                {
                  text: 'View my room',
                  onPress: () =>
                    navigation.navigate('Main', { screen: 'MyRoom' }),
                },
              ]);
            } catch (e) {
              Alert.alert('Reservation failed', e.message);
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
      `Cancel your reservation for Room ${room.number}?`,
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
                .eq('id', reservation.id);
              if (resvError) throw resvError;

              const { error: roomError } = await supabase
                .from('rooms')
                .update({ status: 'available' })
                .eq('id', room.id);
              if (roomError) throw roomError;

              await load().catch(() => {});
              Alert.alert('Cancelled', 'Reservation removed.');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
            setBusy(false);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.patient} />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={s.center}>
        <Feather
          name="alert-circle"
          size={iconSize.hero}
          color={colors.ink300}
        />
        <Text style={s.emptyTitle}>Room not found</Text>
      </View>
    );
  }

  const isMine = reservation?.room?.id === room.id;
  const hasOtherReservation = reservation && !isMine;
  const canReserve = room.status === 'available' && !reservation;

  return (
    <ScrollView
      contentContainerStyle={s.screen}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero card */}
      <View style={s.hero}>
        <Text style={s.overline}>ROOM</Text>
        <Text style={s.heroNumber}>{room.number}</Text>
        <Text style={s.heroType}>{room.type}</Text>

        <View style={s.heroFooter}>
          <View>
            <Text style={s.priceLabel}>Daily rate</Text>
            <View style={s.priceRow}>
              <Text style={s.price}>₱{room.price.toLocaleString()}</Text>
              <Text style={s.priceUnit}> / day</Text>
            </View>
          </View>
          <StatusBadge status={room.status} />
        </View>
      </View>

      {/* Banners */}
      {isMine && (
        <View style={[s.banner, s.bannerSuccess]}>
          <Feather
            name="check-circle"
            size={iconSize.ui}
            color={colors.success}
          />
          <Text style={[s.bannerText, { color: colors.success }]}>
            This room is reserved by you
          </Text>
        </View>
      )}

      {hasOtherReservation && (
        <View style={[s.banner, s.bannerWarning]}>
          <Feather
            name="alert-triangle"
            size={iconSize.ui}
            color={colors.warning}
          />
          <Text style={[s.bannerText, { color: colors.warning }]}>
            You already have Room {reservation.room.number} reserved. Cancel it
            first to reserve another.
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={s.actions}>
        {canReserve && (
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, busy && s.btnBusy]}
            onPress={handleReserve}
            disabled={busy}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather name="plus" size={iconSize.ui} color={colors.white} />
                <Text style={s.btnPrimaryText}>Reserve this room</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isMine && (
          <TouchableOpacity
            style={[s.btn, s.btnDanger, busy && s.btnBusy]}
            onPress={handleCancel}
            disabled={busy}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather name="x" size={iconSize.ui} color={colors.white} />
                <Text style={s.btnPrimaryText}>Cancel reservation</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {!canReserve && !isMine && (
          <View style={[s.btn, s.btnDisabled]}>
            <Feather
              name={room.status === 'occupied' ? 'x-octagon' : 'lock'}
              size={iconSize.ui}
              color={colors.ink500}
            />
            <Text style={s.btnDisabledText}>
              {room.status === 'occupied'
                ? 'Room is occupied'
                : 'Already reserved'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

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

const s = StyleSheet.create({
  screen: {
    padding: spacing.base,
    backgroundColor: colors.ink50,
    gap: spacing.base,
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

  hero: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  overline: {
    ...type.overline,
  },
  heroNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -1,
    marginTop: spacing.xs,
  },
  heroType: {
    ...type.caption,
    marginTop: spacing.xs,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.lg,
  },
  priceLabel: {
    ...type.caption,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink900,
  },
  priceUnit: {
    fontSize: 13,
    color: colors.ink500,
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

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.md,
  },
  bannerSuccess: { backgroundColor: colors.successSoft },
  bannerWarning: { backgroundColor: colors.warningSoft },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  actions: {
    gap: spacing.md,
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
  btnPrimary: { backgroundColor: colors.patient },
  btnDanger: { backgroundColor: colors.danger },
  btnDisabled: { backgroundColor: colors.ink100 },
  btnBusy: { opacity: 0.7 },
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