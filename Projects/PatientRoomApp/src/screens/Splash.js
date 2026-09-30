// src/screens/Splash.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, type, iconSize } from '../theme';

export default function Splash() {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <View style={s.screen}>
      <Animated.View style={[s.content, { opacity: fade }]}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <Feather name="activity" size={36} color={colors.patient} />
        </View>

        {/* Brand */}
        <Text style={s.brandName}>Patient Portal</Text>
        <Text style={s.brandTag}>Hospital room management</Text>
      </Animated.View>

      {/* Loading indicator at the bottom */}
      <View style={s.footer}>
        <ActivityIndicator size="small" color={colors.patient} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.patientSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.4,
  },
  brandTag: {
    ...type.caption,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignItems: 'center',
  },
});