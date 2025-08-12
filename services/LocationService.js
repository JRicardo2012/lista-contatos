// services/LocationService.js - VERSÃO CORRIGIDA E EXPANDIDA
import * as Location from 'expo-location';

export async function getCurrentLocation() {
  try {
    console.log('📍 Solicitando localização...');

    // Solicita permissão
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('❌ Permissão de localização negada');
      throw new Error('Permissão de localização negada.');
    }

    console.log('✅ Permissão concedida, obtendo localização...');

    // Obtém localização atual com configurações otimizadas
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High, // Mudado para High para melhor precisão
      timeout: 15000, // 15 segundos timeout
      maximumAge: 10000 // Cache de 10 segundos
    });

    const { latitude, longitude, accuracy, altitude } = location.coords;
    console.log(`📍 Localização obtida: ${latitude}, ${longitude} (precisão: ${accuracy}m)`);

    // Dados básicos de localização
    const locationData = {
      lat: latitude,
      lng: longitude,
      accuracy: accuracy || 0,
      altitude: altitude || 0,
      address: `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`,
      establishment: 'Estabelecimento desconhecido',
      street: '',
      number: '',
      district: '',
      city: '',
      state: '',
      zipcode: '',
      country: 'Brasil'
    };

    // Tenta fazer geocoding reverso para obter endereço detalhado
    try {
      console.log('🔍 Fazendo geocoding reverso...');
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      console.log('📊 Resultado do geocoding completo:', JSON.stringify(reverseGeocode, null, 2));

      if (reverseGeocode && reverseGeocode.length > 0) {
        const geoData = reverseGeocode[0];
        console.log('📋 Processando dados do geocoding...');

        // MAPEAMENTO CORRIGIDO baseado no Expo Location API
        // Documentação: https://docs.expo.dev/versions/latest/sdk/location/

        // Nome do local/estabelecimento
        if (geoData.name) {
          locationData.establishment = geoData.name;
          console.log('🏪 Nome do local:', geoData.name);
        }

        // Rua/Avenida
        if (geoData.street) {
          locationData.street = geoData.street;
          console.log('🛣️ Rua:', geoData.street);
        }

        // Número do endereço
        if (geoData.streetNumber) {
          locationData.number = geoData.streetNumber;
          console.log('🔢 Número:', geoData.streetNumber);
        }

        // Bairro/Distrito - Tenta múltiplas propriedades
        const district =
          geoData.sublocality ||
          geoData.district ||
          geoData.subLocalityLevel1 ||
          geoData.neighborhood;
        if (district) {
          locationData.district = district;
          console.log('🏘️ Bairro:', district);
        }

        // Cidade - Tenta múltiplas propriedades
        const city =
          geoData.city ||
          geoData.locality ||
          geoData.subAdministrativeArea ||
          geoData.municipalitySubdivision;
        if (city) {
          locationData.city = city;
          console.log('🏙️ Cidade:', city);
        }

        // Estado/Região
        const state = geoData.region || geoData.administrativeArea || geoData.isoCountryCode;
        if (state) {
          locationData.state = state;
          console.log('🗺️ Estado:', state);
        }

        // CEP
        if (geoData.postalCode) {
          locationData.zipcode = geoData.postalCode;
          console.log('📮 CEP:', geoData.postalCode);
        }

        // País
        if (geoData.country) {
          locationData.country = geoData.country;
          console.log('🌍 País:', geoData.country);
        }

        // Monta endereço legível
        const addressParts = [];
        if (locationData.street) {
          if (locationData.number) {
            addressParts.push(`${locationData.street}, ${locationData.number}`);
          } else {
            addressParts.push(locationData.street);
          }
        }
        if (locationData.district) addressParts.push(locationData.district);
        if (locationData.city) addressParts.push(locationData.city);
        if (locationData.state) addressParts.push(locationData.state);

        if (addressParts.length > 0) {
          locationData.address = addressParts.join(', ');
          console.log('📍 Endereço formatado:', locationData.address);
        }

        // Se não conseguiu identificar o estabelecimento pelo nome, usa a rua
        if (locationData.establishment === 'Estabelecimento desconhecido') {
          if (locationData.street) {
            locationData.establishment = `Próximo à ${locationData.street}`;
          } else if (locationData.district) {
            locationData.establishment = `Localização em ${locationData.district}`;
          } else if (locationData.city) {
            locationData.establishment = `Localização em ${locationData.city}`;
          }
        }

        console.log('✅ Geocoding reverso realizado com sucesso');
        console.log('📊 Dados finais:', locationData);
      } else {
        console.log('⚠️ Nenhum resultado no geocoding reverso');
      }
    } catch (geocodeError) {
      console.warn('⚠️ Erro no geocoding reverso:', geocodeError.message);
      // Continua com dados básicos de coordenadas
    }

    return locationData;
  } catch (error) {
    console.error('❌ Erro ao obter localização:', error);

    // Retorna localização padrão (Araraquara, SP) em caso de erro
    return {
      lat: -21.7959,
      lng: -48.1759,
      accuracy: 0,
      altitude: 0,
      address: 'Localização não disponível',
      establishment: 'Local não identificado',
      street: '',
      number: '',
      district: '',
      city: 'Araraquara',
      state: 'São Paulo',
      zipcode: '',
      country: 'Brasil'
    };
  }
}

// NOVA FUNÇÃO: Localização enriquecida com mais dados
export async function getEnrichedLocation() {
  try {
    // Obtém localização básica
    const basicLocation = await getCurrentLocation();

    // Adiciona timestamp
    basicLocation.timestamp = new Date().toISOString();

    // Adiciona informações de contexto
    basicLocation.context = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: 'pt-BR',
      source: 'gps'
    };

    return basicLocation;
  } catch (error) {
    console.error('❌ Erro ao obter localização enriquecida:', error);
    throw error;
  }
}

// Função para verificar permissão
export async function checkLocationPermission() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    return false;
  }
}

// Função para solicitar permissão
export async function requestLocationPermission() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão:', error);
    return false;
  }
}

// NOVA FUNÇÃO: Validar coordenadas
export function validateCoordinates(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  return {
    isValid:
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180,
    latitude,
    longitude
  };
}

// NOVA FUNÇÃO: Calcular distância entre dois pontos
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return {
    kilometers: distance,
    meters: distance * 1000,
    formatted: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
  };
}

// NOVA FUNÇÃO: Obter endereço formatado para display
export function formatAddressForDisplay(locationData) {
  if (!locationData) return 'Endereço não disponível';

  const parts = [];

  // Endereço principal
  if (locationData.street) {
    if (locationData.number) {
      parts.push(`${locationData.street}, ${locationData.number}`);
    } else {
      parts.push(locationData.street);
    }
  }

  // Bairro
  if (locationData.district) {
    parts.push(locationData.district);
  }

  // Cidade e Estado
  const cityState = [];
  if (locationData.city) cityState.push(locationData.city);
  if (locationData.state) cityState.push(locationData.state);
  if (cityState.length > 0) {
    parts.push(cityState.join(', '));
  }

  // CEP
  if (locationData.zipcode) {
    parts.push(`CEP: ${locationData.zipcode}`);
  }

  return parts.length > 0 ? parts.join(' - ') : 'Endereço não disponível';
}

// Exporta todas as funções
export default {
  getCurrentLocation,
  getEnrichedLocation,
  checkLocationPermission,
  requestLocationPermission,
  validateCoordinates,
  calculateDistance,
  formatAddressForDisplay
};
