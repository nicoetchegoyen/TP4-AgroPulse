import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

// rf-01: la entrada inicial lleva al ingreso o al inicio según la sesión guardada.
export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />;
}
