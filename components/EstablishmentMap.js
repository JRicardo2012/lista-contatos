import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSQLiteContext } from 'expo-sqlite';
import * as Location from 'expo-location';
import * as geolib from 'geolib';

export default function EstablishmentMap() {
  const db = useSQLiteContext();
  const [establishments, setEstablishments] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [nearest, setNearest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadEstablishments();
    }
  }, [userLocation]);

  async function loadEstablishments() {
    try {
      const data = await db.getAllAsync("SELECT * FROM establishments WHERE lat IS NOT NULL AND lng IS NOT NULL");
      setEstablishments(data);
      calculateNearest(data);
    } catch (error) {
      console.error("Erro ao carregar estabelecimentos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permissão negada", "Habilite a localização.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      });

    } catch (error) {
      console.error("Erro localização:", error);
    }
  }

  function calculateNearest(data) {
    if (!userLocation || data.length === 0) return;

    const nearestEst = geolib.findNearest(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      data.map(e => ({ latitude: e.lat, longitude: e.lng, id: e.id, name: e.name }))
    );

    if (nearestEst) {
      const establishment = data.find(e => e.id === nearestEst.id);
      setNearest({ ...establishment, distance: nearestEst.distance });
    }
  }

  if (loading || !userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text>Carregando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {nearest && (
        <View style={styles.infoBox}>
          <Text>📍 Mais próximo: {nearest.name}</Text>
          <Text>Distância: {(nearest.distance / 1000).toFixed(2)} km</Text>
        </View>
      )}

      <MapView
        style={styles.map}
        initialRegion={userLocation}
        showsUserLocation
      >
        {establishments.map(est => (
          <Marker
            key={est.id}
            coordinate={{ latitude: est.lat, longitude: est.lng }}
            title={est.name}
            description={`${est.street || ''}, ${est.city || ''}`}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoBox: {
    backgroundColor: '#ffffffee',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'center'
  }
});
