// src/screens/Profile.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, shadow, type, iconSize } from '../theme';

export default function Profile() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Log out', 'End your session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (!user) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.patient} />
      </View>
    );
  }

  const isAdmin = user.role === 'admin';
  const accent = isAdmin ? colors.admin : colors.patient;
  const accentSoft = isAdmin ? colors.adminSoft : colors.patientSoft;
  const accentInk = isAdmin ? colors.adminInk : colors.patientInk;

  const displayName =
    user.full_name || user.fullName || user.username || 'Patient';
  const initial = displayName[0]?.toUpperCase() || 'P';

  return (
    <ScrollView
      contentContainerStyle={s.screen}
      showsVerticalScrollIndicator={false}
    >
      {/* ─────── Identity Hero ─────── */}
      <View style={s.hero}>
        <View style={[s.avatar, { backgroundColor: accent }]}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <Text style={s.name}>{displayName}</Text>
        <Text style={s.username}>@{user.username}</Text>

        <View style={[s.roleBadge, { backgroundColor: accentSoft }]}>
          <Feather
            name={isAdmin ? 'shield' : 'user'}
            size={12}
            color={accentInk}
          />
          <Text style={[s.roleLabel, { color: accentInk }]}>
            {isAdmin ? 'Admin' : 'Patient'}
          </Text>
        </View>
      </View>

      {/* ─────── Account Info ─────── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Account information</Text>

        <InfoRow
          icon="user"
          label="Name"
          value={displayName}
        />
        <InfoRow
          icon="at-sign"
          label="Username"
          value={`@${user.username}`}
        />
        <InfoRow
          icon="mail"
          label="Email"
          value={user.email || '—'}
          muted={!user.email}
        />
        <InfoRow
          icon="phone"
          label="Phone"
          value={user.phone || '—'}
          muted={!user.phone}
          isLast={!user.age && !user.bloodType && !user.nfcUid}
        />
        {user.age && (
          <InfoRow icon="calendar" label="Age" value={String(user.age)} />
        )}
        {user.bloodType && (
          <InfoRow icon="droplet" label="Blood type" value={user.bloodType} />
        )}
        {user.nfcUid && (
          <InfoRow
            icon="wifi"
            label="NFC UID"
            value={user.nfcUid}
            isLast
          />
        )}
      </View>

      {/* ─────── Logout ─────── */}
      <TouchableOpacity
        style={[s.btn, s.btnGhost]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Feather name="log-out" size={iconSize.ui} color={colors.danger} />
        <Text style={s.btnGhostText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────── Info Row ───────────

const InfoRow = ({ icon, label, value, muted, isLast }) => (
  <View style={[s.infoRow, isLast && s.infoRowLast]}>
    <View style={s.infoIcon}>
      <Feather name={icon} size={16} color={colors.ink500} />
    </View>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={[s.infoValue, muted && s.infoValueMuted]} numberOfLines={1}>
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
    alignItems: 'center',
    ...shadow.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink900,
    letterSpacing: -0.3,
  },
  username: {
    ...type.caption,
    marginTop: spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
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

  // ── Info Row ──
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoIcon: {
    width: 24,
    alignItems: 'center',
  },
  infoLabel: {
    ...type.caption,
    width: 84,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink900,
    textAlign: 'right',
  },
  infoValueMuted: {
    color: colors.ink300,
    fontWeight: '500',
  },

  // ── Button ──
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
    borderRadius: radius.md,
    minHeight: 52,
  },
  btnGhost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink300,
  },
  btnGhostText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
});