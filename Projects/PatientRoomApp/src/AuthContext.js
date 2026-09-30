// src/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './supabase';

const Ctx = createContext();

const formatEmail = (username) => `${username.toLowerCase().trim()}@patientroom.local`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile row and merge with auth user
  const buildUser = async (sbUser) => {
    // 1. Start with metadata
    const base = {
      id: sbUser.id,
      email: sbUser.email,
      username: sbUser.user_metadata?.username || sbUser.email.split('@')[0],
      role: sbUser.user_metadata?.role || 'patient',
      ...sbUser.user_metadata,
    };

    // 2. Override with the freshest role from the profiles table
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name, username')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (!error && profile) {
        base.role = profile.role || base.role;
        base.username = profile.username || base.username;
        if (profile.full_name) base.full_name = profile.full_name;
      }
    } catch (e) {
      console.warn('Profile fetch:', e.message);
    }

    return base;
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(await buildUser(session.user));
      }
      setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(await buildUser(session.user));
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  const login = async (username, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formatEmail(username),
        password,
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('Login:', e.message);
      return false;
    }
  };

  const register = async (payload) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: formatEmail(payload.username),
        password: payload.password,
        options: {
          data: {
            username: payload.username,
            role: payload.role || 'patient',
            full_name: payload.fullName || '',
            ...payload,
          },
        },
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('Register:', e.message);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (data) => {
    try {
      const { data: updatedUser, error } = await supabase.auth.updateUser({
        data,
      });
      if (error) throw error;
      setUser(await buildUser(updatedUser.user));
    } catch (e) {
      console.warn('Update Profile:', e.message);
    }
  };

  const refresh = async () => {
    const { data: { user: sbUser } } = await supabase.auth.getUser();
    if (sbUser) setUser(await buildUser(sbUser));
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, updateProfile, refresh }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);