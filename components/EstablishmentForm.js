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
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {establishment?.id ? "✏️ Editar Estabelecimento" : "🏪 Novo Estabelecimento"}
          </Text>
          <Text style={styles.headerSubtitle}>
            Preencha as informações do local
          </Text>
        </View>

        {/* Card 1: Informações Básicas */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.label}>📝 Nome do Estabelecimento *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Restaurante Central, Farmácia São João"
                value={name}
                onChangeText={setName}
                maxLength={100}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>📂 Categoria</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Restaurante, Farmácia, Supermercado"
                value={category}
                onChangeText={setCategory}
                maxLength={50}
              />
            </View>
          </View>
        </View>

        {/* Card 2: Endereço */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📍</Text>
            <Text style={styles.cardTitle}>Endereço</Text>
            <TouchableOpacity 
              style={[styles.gpsButton, gettingLocation && styles.gpsButtonDisabled]}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.gpsButtonIcon}>📍</Text>
              )}
              <Text style={styles.gpsButtonText}>
                {gettingLocation ? "Obtendo..." : "GPS"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            {/* Rua e Número */}
            <View style={styles.addressRow}>
              <View style={styles.streetField}>
                <Text style={styles.label}>🛣️ Rua/Avenida</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome da rua"
                  value={street}
                  onChangeText={setStreet}
                />
              </View>
              <View style={styles.numberField}>
                <Text style={styles.label}>🔢 Número</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={number}
                  onChangeText={setNumber}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Bairro */}
            <View style={styles.field}>
              <Text style={styles.label}>🏘️ Bairro</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do bairro"
                value={district}
                onChangeText={setDistrict}
              />
            </View>

            {/* Cidade e Estado */}
            <View style={styles.cityRow}>
              <View style={styles.cityField}>
                <Text style={styles.label}>🏙️ Cidade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Cidade"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.stateField}>
                <Text style={styles.label}>🗺️ Estado</Text>
                <TextInput
                  style={styles.input}
                  placeholder="São Paulo"
                  value={state}
                  onChangeText={setState}
                  maxLength={20}
                />
              </View>
            </View>

            {/* CEP */}
            <View style={styles.field}>
              <Text style={styles.label}>📮 CEP</Text>
              <TextInput
                style={styles.input}
                placeholder="00000-000"
                value={zipcode}
                onChangeText={setZipcode}
                keyboardType="numeric"
                maxLength={9}
              />
            </View>
          </View>
        </View>

        {/* Card 3: Contato */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📞</Text>
            <Text style={styles.cardTitle}>Contato</Text>
          </View>
          
          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.label}>📱 Telefone</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </View>
        </View>

        {/* Status da Localização */}
        {latitude && longitude && (
          <View style={styles.locationStatus}>
            <Text style={styles.locationIcon}>🌐</Text>
            <Text style={styles.locationText}>
              Localização GPS capturada com sucesso!
            </Text>
          </View>
        )}

        {/* Espaço para o botão não ficar grudado nos controles do celular */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Botão Fixo na Parte Inferior */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={handleSave} 
          disabled={saving || !name.trim()}
        >
          {saving ? (
            <View style={styles.savingContainer}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.saveButtonText}>Salvando...</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>
              {establishment?.id ? "💾 Atualizar Estabelecimento" : "💾 Salvar Estabelecimento"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // ScrollView
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Espaço para o botão fixo
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },

  // GPS Button no Header do Card
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  gpsButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  gpsButtonIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  gpsButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Fields
  fieldGroup: {
    gap: 16,
  },
  
  field: {
    marginBottom: 0,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },

  // Address Rows
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  streetField: {
    flex: 2,
  },
  numberField: {
    flex: 1,
  },

  cityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cityField: {
    flex: 1.5,
  },
  stateField: {
    flex: 1,
  },

  // Location Status
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 20,
  },

  // Bottom Container (Botão Fixo)
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 20,
    paddingBottom: 34, // Espaço extra para não interferir com controles do celular
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },

  // Save Button
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});