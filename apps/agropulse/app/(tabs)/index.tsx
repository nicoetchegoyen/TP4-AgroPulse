import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polygon, type MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';
import { ScreenState } from '@/components/ScreenState';
import { useOrganization } from '@/contexts/OrganizationContext';
import { isPointInsidePolygon, polygonCoordinates, type Coordinate } from '@/lib/geo';
import { colors, statusMeta } from '@/lib/theme';
import { usePlotSummaries } from '@/hooks/usePlotSummaries';

const initialRegion = {
  latitude: -31.391,
  longitude: -58.020,
  latitudeDelta: 0.026,
  longitudeDelta: 0.026,
};

export default function MapScreen() {
  const { activeMembership, loading: organizationLoading } = useOrganization();
  const { plots, loading, error, refresh } = usePlotSummaries(activeMembership?.organization_id);
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const containingPlot = useMemo(
    () => (location ? plots.find((plot) => isPointInsidePolygon(location, plot.geom)) : undefined),
    [location, plots],
  );

  const locate = async () => {
    setLocating(true);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setLocating(false);
      Alert.alert('Ubicación no disponible', 'Podés usar el mapa sin otorgar permiso de ubicación.');
      return;
    }
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch {
      Alert.alert('Ubicación no disponible', 'No se pudo obtener la posición actual.');
    } finally {
      setLocating(false);
    }
  };

  if (organizationLoading || loading) return <ScreenState loading title="Cargando el establecimiento…" />;
  if (error) return <ScreenState title="No pudimos cargar el mapa" message={error} onRetry={() => void refresh()} />;
  if (!activeMembership) return <ScreenState title="Sin establecimiento" message="Este usuario todavía no pertenece a un establecimiento." />;
  if (plots.length === 0) return <ScreenState title="No hay lotes" message="Cargá la semilla para ver los polígonos del establecimiento." onRetry={() => void refresh()} />;

  const onMapPress = (_event: MapPressEvent) => setSelectedName(null);

  return (
    <View style={styles.container}>
      <OrganizationSwitcher />
      <View style={styles.mapContainer}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion} onPress={onMapPress}>
          {plots.map((plot) => {
            const meta = statusMeta[plot.status];
            return (
              <Polygon
                key={plot.id}
                coordinates={polygonCoordinates(plot.geom)}
                fillColor={`${meta.color}55`}
                strokeColor={meta.color}
                strokeWidth={3}
                tappable
                onPress={() => {
                  setSelectedName(plot.name);
                  router.push({ pathname: '/plot/[id]', params: { id: plot.id } });
                }}
              />
            );
          })}
          {location ? <Marker coordinate={location} title="Tu ubicación" pinColor={colors.primaryDark} /> : null}
        </MapView>

        <View style={styles.legend}>
          {(Object.keys(statusMeta) as Array<keyof typeof statusMeta>).map((status) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: statusMeta[status].color }]} />
              <Text style={styles.legendText}>{statusMeta[status].label}</Text>
            </View>
          ))}
        </View>

        {location ? (
          <View style={styles.locationResult}>
            <Text style={styles.locationResultText}>
              {containingPlot ? `Estás dentro de ${containingPlot.name}` : 'No estás dentro de un lote registrado'}
            </Text>
          </View>
        ) : null}

        {selectedName ? <Text style={styles.selected}>{selectedName}</Text> : null}
        <Pressable accessibilityLabel="Usar mi ubicación" onPress={() => void locate()} style={styles.fab}>
          <MaterialCommunityIcons name={locating ? 'crosshairs-gps' : 'crosshairs'} size={26} color="white" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { flex: 1, overflow: 'hidden' },
  legend: { position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 14, padding: 12, gap: 7, borderWidth: 1, borderColor: colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  locationResult: { position: 'absolute', left: 14, right: 14, bottom: 86, backgroundColor: 'rgba(23,49,35,0.92)', borderRadius: 14, padding: 13 },
  locationResultText: { color: 'white', textAlign: 'center', fontWeight: '700' },
  selected: { position: 'absolute', top: 14, right: 14, color: colors.ink, backgroundColor: 'white', borderRadius: 10, padding: 8, fontWeight: '700' },
  fab: { position: 'absolute', right: 18, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
});
