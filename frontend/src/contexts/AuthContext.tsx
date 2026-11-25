import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { api } from "../services/api";
import type { IntegrationStatus, UserProfile } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const LOCAL_USER_KEY = "learnmate_user_profile_v1";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  integrations: IntegrationStatus | null;
  supabaseAuthEnabled: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  continueAsLocalStudent: (name: string, email?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const health = await api.getHealth();
        if (mounted) setIntegrations(health.integrations);
      } catch {
        // backend may still be starting
      }

      if (supabaseClient) {
        const { data } = await supabaseClient.auth.getSession();
        if (data.session?.user && mounted) {
          const u = data.session.user;
          const profile: UserProfile = {
            id: u.id,
            name: (u.user_metadata?.name as string) || u.email?.split("@")[0] || "Student",
            email: u.email || "",
            isSupabaseAuth: true,
          };
          await api.upsertUser(profile).catch(() => undefined);
          setUser(profile);
          setLoading(false);
          return;
        }
      }

      const saved = localStorage.getItem(LOCAL_USER_KEY);
      if (saved && mounted) {
        try {
          const parsed = JSON.parse(saved) as UserProfile;
          setUser(parsed);
          api.upsertUser(parsed).catch(() => undefined);
        } catch {
          localStorage.removeItem(LOCAL_USER_KEY);
        }
      }
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabaseClient) {
      throw new Error("Supabase Auth is not configured. Use Local Student Mode instead.");
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Sign-in succeeded without a user payload.");

    const profile: UserProfile = {
      id: data.user.id,
      name: (data.user.user_metadata?.name as string) || email.split("@")[0],
      email: data.user.email || email,
      isSupabaseAuth: true,
    };
    await api.upsertUser(profile);
    setUser(profile);
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    if (!supabaseClient) {
      throw new Error("Supabase Auth is not configured. Use Local Student Mode instead.");
    }
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    if (data.user) {
      const profile: UserProfile = {
        id: data.user.id,
        name,
        email,
        isSupabaseAuth: true,
      };
      await api.upsertUser(profile);
      setUser(profile);
    }
  };

  const continueAsLocalStudent = async (name: string, email?: string) => {
    const cleanName = name.trim() || "Alex Chen";
    const cleanEmail =
      email?.trim() || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@student.local`;
    const created = await api.upsertUser({
      id: localStorage.getItem(LOCAL_USER_KEY)
        ? (JSON.parse(localStorage.getItem(LOCAL_USER_KEY)!) as UserProfile).id
        : undefined,
      name: cleanName,
      email: cleanEmail,
    });
    const profile: UserProfile = { ...created, isSupabaseAuth: false };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    setUser(profile);
  };

  const signOut = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut().catch(() => undefined);
    }
    localStorage.removeItem(LOCAL_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        integrations,
        supabaseAuthEnabled: Boolean(supabaseClient),
        signInWithEmail,
        signUpWithEmail,
        continueAsLocalStudent,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
