import { Stack } from 'expo-router';

// rnf-01: agrupa las pantallas de ingreso sin mostrar una cabecera adicional.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
