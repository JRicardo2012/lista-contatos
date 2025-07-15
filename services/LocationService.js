import * as Location from "expo-location";

export async function getCurrentLocation() {
  try {
    console.log('📍 Solicitando localização...');
    
    // Solicita permissão
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn('❌ Permissão de localização negada');
      throw new Error("Permissão de localização negada.");
    }

    console.log('✅ Permissão concedida, obtendo localização...');

    // Obtém localização atual com timeout
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 10000, // 10 segundos timeout
    });

    const { latitude, longitude } = location.coords;
    console.log(`📍 Localização obtida: ${latitude}, ${longitude}`);

    // Tenta fazer geocoding reverso para obter endereço real
    let address = `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`;
    let establishment = "Estabelecimento desconhecido";

    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const location = reverseGeocode[0];
        
        // Monta endereço mais legível
        const addressParts = [];
        if (location.name) addressParts.push(location.name);
        if (location.street) addressParts.push(location.street);
        if (location.district) addressParts.push(location.district);
        if (location.city) addressParts.push(location.city);
        
        if (addressParts.length > 0) {
          address = addressParts.join(', ');
        }

        // Define estabelecimento baseado no nome do local
        if (location.name && location.name !== location.street) {
          establishment = location.name;
        } else if (location.street) {
          establishment = `Próximo a ${location.street}`;
        }

        console.log('✅ Geocoding reverso realizado:', address);
      }
    } catch (geocodeError) {
      console.warn('⚠️ Erro no geocoding reverso:', geocodeError.message);
      // Continua com dados básicos
    }

    return {
      lat: latitude,
      lng: longitude,
      address: address,
      establishment: establishment,
    };

  } catch (error) {
    console.error("❌ Erro ao obter localização:", error);
    
    // Retorna localização padrão em caso de erro
    return {
      lat: -21.7959, // Coordenadas de Araraquara, SP
      lng: -48.1759,
      address: "Localização não disponível",
      establishment: "Local não identificado",
    };
  }
}

export async function checkLocationPermission() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    return false;
  }
}

export async function requestLocationPermission() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão:', error);
    return false;
  }
}