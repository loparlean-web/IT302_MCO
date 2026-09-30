// src/screens/NfcScan.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, shadow, type, iconSize } from '../theme';

const generateUid = () => {
  const hex = '0123456789ABCDEF';
  let uid = '';
  for (let i = 0; i < 10; i++) uid += hex[Math.floor(Math.random() * 16)];
  return uid;
};

export default function NfcScan() {
  const { user, refresh } = useAuth();
  const [myUid, setMyUid] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMyCard = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('nfc_cards')
        .select('uid')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setMyUid(data?.uid || null);
    } catch (e) {
      console.warn('NFC load:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadMyCard();
    }, [loadMyCard])
  );

  const handleRegister = () => {
    Alert.alert(
      'Register NFC card',
      'This will link a new NFC UID to your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Register',
          onPress: async () => {
            setRegistering(true);
            try {
              const newUid = generateUid();
              const { error } = await supabase
                .from('nfc_cards')
                .insert([{ uid: newUid, user_id: user.id }]);
              if (error) throw error;

              setMyUid(newUid);
              await refresh();
              Alert.alert('Registered', `Card ${newUid} linked to your account.`);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
            setRegistering(false);
          },
        },
      ]
    );
  };

  const scanCard = async (uid) => {
    const { data, error } = await supabase
      .from('nfc_cards')
      .select(`
        uid,
        user_id,
        profile:profiles (id, username, full_name, age, blood_type, phone)
      `)
      .eq('uid', uid)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { verified: false, nfcUid: uid };
    return {
      verified: true,
      nfcUid: uid,
      patient: data.profile
        ? {
            id: data.profile.id,
            name: data.profile.full_name || data.profile.username,
            username: data.profile.username,
            age: data.profile.age,
            bloodType: data.profile.blood_type,
            phone: data.profile.phone,
          }
        : null,
    };
  };

  const handleScan = async () => {
    if (!myUid) return;
    setScanning(true);
    setResult(null);
    try {
      const res = await scanCard(myUid);
      setResult(res);
    } catch (e) {
      Alert.alert('Scan error', e.message);
    }
    setScanning(false);
  };

  const handleScanOther = async () => {
    setScanning(true);
    setResult(null);
    try {
      const res = await scanCard(generateUid());
      setResult(res);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setScanning(false);
  };

  const handleUnregister = () => {
    Alert.alert('Unregister card', 'Remove the NFC card from your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unregister',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('nfc_cards')
              .delete()
              .eq('user_id', user.id);
            if (error) throw error;

            setMyUid(null);
            setResult(null);
            await refresh();
            Alert.alert('Removed', 'NFC card unlinked from your account.');
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.patient} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.screen}
      showsVerticalScrollIndicator={false}
    >
      {/* ─────── Card Status Hero ─────── */}
      <View style={s.hero}>
        <View
          style={[
            s.statusIcon,
            {
              backgroundColor: myUid ? colors.successSoft : colors.ink100,
            },
          ]}
        >
          <Feather
            name="wifi"
            size={28}
            color={myUid ? colors.success : colors.ink500}
          />
        </View>

        <Text style={s.heroTitle}>
          {myUid ? 'Card registered' : 'No card linked'}
        </Text>
        <Text style={s.heroSubtitle}>
          {myUid
            ? `Linked to @${user?.username || 'you'}`
            : 'Register an NFC card to enable tap verification'}
        </Text>

        {myUid && (
          <View style={s.uidPill}>
            <Text style={s.uidLabel}>UID</Text>
            <Text style={s.uidValue}>{myUid}</Text>
          </View>
        )}
      </View>

      {/* ─────── Primary Action ─────── */}
      {!myUid ? (
        <TouchableOpacity
          style={[s.btn, s.btnPrimary, registering && s.btnBusy]}
          onPress={handleRegister}
          disabled={registering}
          activeOpacity={0.8}
        >
          {registering ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Feather name="plus" size={iconSize.ui} color={colors.white} />
              <Text style={s.btnPrimaryText}>Register NFC card</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, scanning && s.btnBusy]}
            onPress={handleScan}
            disabled={scanning}
            activeOpacity={0.8}
          >
            {scanning ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather name="maximize" size={iconSize.ui} color={colors.white} />
                <Text style={s.btnPrimaryText}>Scan my card</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.secondaryRow}>
            <TouchableOpacity
              style={[s.btn, s.btnGhost, s.btnHalf]}
              onPress={handleScanOther}
              disabled={scanning}
              activeOpacity={0.7}
            >
              <Feather name="search" size={iconSize.inline} color={colors.ink700} />
              <Text style={s.btnGhostText}>Test unknown</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btn, s.btnGhostDanger, s.btnHalf]}
              onPress={handleUnregister}
              disabled={scanning}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={iconSize.inline} color={colors.danger} />
              <Text style={s.btnGhostDangerText}>Unregister</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ─────── Scan Result ─────── */}
      {result && <ResultCard result={result} onClose={() => setResult(null)} />}
    </ScrollView>
  );
}

// ─────────── Result Card ───────────

const ResultCard = ({ result, onClose }) => {
  const verified = result.verified;
  const cfg = verified
    ? { bg: colors.successSoft, fg: colors.success, icon: 'check-circle', label: 'Verified patient' }
    : { bg: colors.dangerSoft, fg: colors.danger, icon: 'x-circle', label: 'Unregistered card' };

  return (
    <View style={[s.resultCard, { backgroundColor: cfg.bg }]}>
      <View style={s.resultHeader}>
        <Feather name={cfg.icon} size={iconSize.ui} color={cfg.fg} />
        <Text style={[s.resultLabel, { color: cfg.fg }]}>{cfg.label}</Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={18} color={cfg.fg} />
        </TouchableOpacity>
      </View>

      <View style={s.resultDivider} />

      <View style={s.resultRow}>
        <Text style={s.resultRowLabel}>NFC UID</Text>
        <Text style={s.resultRowValue}>{result.nfcUid}</Text>
      </View>

      {verified && result.patient ? (
        <>
          <View style={s.resultRow}>
            <Text style={s.resultRowLabel}>Name</Text>
            <Text style={s.resultRowValue}>{result.patient.name}</Text>
          </View>
          <View style={s.resultRow}>
            <Text style={s.resultRowLabel}>Username</Text>
            <Text style={s.resultRowValue}>@{result.patient.username}</Text>
          </View>
          <View style={s.resultRow}>
            <Text style={s.resultRowLabel}>Age</Text>
            <Text style={s.resultRowValue}>
              {result.patient.age || '—'}
            </Text>
          </View>
          <View style={s.resultRow}>
            <Text style={s.resultRowLabel}>Blood type</Text>
            <Text style={s.resultRowValue}>
              {result.patient.bloodType || '—'}
            </Text>
          </View>
          <View style={[s.resultRow, s.resultRowLast]}>
            <Text style={s.resultRowLabel}>Phone</Text>
            <Text style={s.resultRowValue}>
              {result.patient.phone || '—'}
            </Text>
          </View>
        </>
      ) : verified ? (
        <Text style={s.resultNote}>
          Card is linked, but profile details are not visible.
        </Text>
      ) : (
        <Text style={s.resultNote}>
          This card is not linked to any registered patient.
        </Text>
      )}
    </View>
  );
};

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
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink900,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    ...type.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  uidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  uidLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.ink500,
    letterSpacing: 0.6,
  },
  uidValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink900,
    letterSpacing: 1.2,
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
  btnHalf: {
    flex: 1,
  },
  btnPrimary: { backgroundColor: colors.patient },
  btnBusy: { opacity: 0.7 },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btnGhost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink300,
  },
  btnGhostText: {
    color: colors.ink700,
    fontSize: 14,
    fontWeight: '600',
  },
  btnGhostDanger: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  btnGhostDangerText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Result Card ──
  resultCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  resultDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  resultRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  resultRowLabel: {
    fontSize: 13,
    color: colors.ink500,
  },
  resultRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink900,
    flexShrink: 1,
    textAlign: 'right',
  },
  resultNote: {
    fontSize: 13,
    color: colors.ink700,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
});