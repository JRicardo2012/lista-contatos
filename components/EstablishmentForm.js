import React, { useState } from "react";
import {
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  ScrollView
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import * as Location from "expo-location";

export default function EstablishmentForm({ establishment, onSaved }) {
  const db = useSQLiteContext();
  const [name, setName] = useState(establishment?.name || "");
  const [category, setCategory] = useState(establishment?.category || "");
  const [street, setStreet] = useState(establishment?.street || "");
  const [number, setNumber] = useState(establishment?.number || "");
  const [district, setDistrict] = useState(establishment?.district || "");
  const [city, setCity] = useState(establishment?.city || "");
  const [state, setState] = useState(establishment?.state || "");
  const [zipcode, setZipcode] = useState(establishment?.zipcode || "");
  const [phone, setPhone] = useState(establishment?.phone || "");
  const [latitude, setLatitude] = useState(establishment?.latitude || null);
  const [longitude, setLongitude] = useState(establishment?.longitude || null);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  async function getCurrentLocation() {
    setGettingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão Negada", "Permissão de localização necessária.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeout: 15000,
      });

      const { latitude: lat, longitude: lng } = location.coords;
      
      // Salva coordenadas silenciosamente
      setLatitude(lat);
      setLongitude(lng);

      // Tenta geocoding reverso com preenchimento silencioso
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const location = reverseGeocode[0];
          
          // Preenche campos silenciosamente (só se estiverem vazios)
          if (location.street && !street) {
            setStreet(location.street);
          }
          
          if (location.streetNumber && !number) {
            setNumber(location.streetNumber);
          }
          
          if (location.district && !district) {
            setDistrict(location.district);
          }
          
          if (location.city && !city) {
            setCity(location.city);
          }
          
          if (location.region && !state) {
            setState(location.region);
          }
          
          if (location.postalCode && !zipcode) {
            setZipcode(location.postalCode);
          }
        }
      } catch (geocodeError) {
        console.warn('Erro no geocoding:', geocodeError.message);
      }

    } catch (error) {
      console.error("Erro ao obter localização:", error);
      Alert.alert("Erro", "Não foi possível obter a localização.");
    } finally {
      setGettingLocation(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Validação", "Nome é obrigatório.");
      return;
    }

    setSaving(true);
    
    try {
      const data = {
        name: name.trim(),
        category: category.trim() || null,
        street: street.trim() || null,
        number: number.trim() || null,
        district: district.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zipcode: zipcode.trim() || null,
        phone: phone.trim() || null,
        latitude: latitude,
        longitude: longitude,
      };

      if (establishment?.id) {
        await db.runAsync(
          `UPDATE establishments 
           SET name = ?, category = ?, street = ?, number = ?, district = ?, city = ?, state = ?, zipcode = ?, phone = ?, latitude = ?, longitude = ? 
           WHERE id = ?`,
          [data.name, data.category, data.street, data.number, data.district, data.city, data.state, data.zipcode, data.phone, data.latitude, data.longitude, establishment.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO establishments (name, category, street, number, district, city, state, zipcode, phone, latitude, longitude) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [data.name, data.category, data.street, data.number, data.district, data.city, data.state, data.zipcode, data.phone, data.latitude, data.longitude]
        );
      }

      // Limpa campos apenas se for novo cadastro
      if (!establishment?.id) {
        setName("");
        setCategory("");
        setStreet("");
        setNumber("");
        setDistrict("");
        setCity("");
        setState("");
        setZipcode("");
        setPhone("");
        setLatitude(null);
        setLongitude(null);
      }

      Alert.alert("Sucesso", establishment?.id ? "Atualizado!" : "Cadastrado!");
      if (onSaved) onSaved();

    } catch (error) {
      console.error("Erro ao salvar:", error);
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nome do Estabelecimento *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Restaurante Central"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Categoria</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Restaurante, Farmácia"
        value={category}
        onChangeText={setCategory}
      />

      {/* Campos de Endereço Separados */}
      <Text style={styles.sectionTitle}>📍 Endereço</Text>
      
      <View style={styles.addressRow}>
        <View style={styles.streetContainer}>
          <Text style={styles.label}>Rua/Avenida</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome da rua"
            value={street}
            onChangeText={setStreet}
          />
        </View>
        <View style={styles.numberContainer}>
          <Text style={styles.label}>Número</Text>
          <TextInput
            style={styles.input}
            placeholder="123"
            value={number}
            onChangeText={setNumber}
          />
        </View>
        <TouchableOpacity 
          style={[styles.gpsButton, gettingLocation && styles.gpsButtonDisabled]}
          onPress={getCurrentLocation}
          disabled={gettingLocation}
        >
          {gettingLocation ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.gpsButtonText}>📍</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Bairro</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome do bairro"
        value={district}
        onChangeText={setDistrict}
      />

      <View style={styles.cityRow}>
        <View style={styles.cityContainer}>
          <Text style={styles.label}>Cidade</Text>
          <TextInput
            style={styles.input}
            placeholder="Cidade"
            value={city}
            onChangeText={setCity}
          />
        </View>
        <View style={styles.stateContainer}>
          <Text style={styles.label}>Estado</Text>
          <TextInput
            style={styles.input}
            placeholder="São Paulo"
            value={state}
            onChangeText={setState}
            maxLength={20}
          />
        </View>
      </View>

      <Text style={styles.label}>CEP</Text>
      <TextInput
        style={styles.input}
        placeholder="00000-000"
        value={zipcode}
        onChangeText={setZipcode}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Telefone</Text>
      <TextInput
        style={styles.input}
        placeholder="(00) 00000-0000"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
        onPress={handleSave} 
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? "Salvando..." : "Salvar"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  streetContainer: {
    flex: 2,
    marginRight: 8,
  },
  numberContainer: {
    flex: 1,
    marginRight: 8,
  },
  cityRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  cityContainer: {
    flex: 1.5,
    marginRight: 8,
  },
  stateContainer: {
    flex: 1,
  },
  gpsButton: {
    width: 40,
    height: 40,
    backgroundColor: '#0284c7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  gpsButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  gpsButtonText: {
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});