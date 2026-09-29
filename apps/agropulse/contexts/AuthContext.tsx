import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthValue {
  session: Session | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

// rf-01: comparte la sesión y las acciones de ingreso y salida con todas las pantallas.
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  // rf-01: recupera una sesión guardada y escucha los cambios de autenticación.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInitializing(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitializing(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      initializing,
      // rf-01: supabase valida el correo y la contraseña; aquí solo se muestra el error.
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) return 'Falta configurar Supabase en apps/agropulse/.env.';
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return error?.message ?? null;
      },
      // rf-01: cerrar sesión también limpia el acceso a datos protegidos.
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [initializing, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// este acceso evita pasar la sesión manualmente por cada componente.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
