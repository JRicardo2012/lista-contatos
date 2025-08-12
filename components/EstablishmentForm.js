// components/EstablishmentForm.js - VERSÃO COM MODALFORM
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as Location from 'expo-location';
import { useAuth } from '../services/AuthContext';
import ModalForm from './ModalForm';

// Funções de formatação
const formatCEP = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) {
    return numbers;
  }
  return numbers.replace(/(\d{5})(\d{0,3})/, '$1-$2');
};

const formatPhone = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) {
    return numbers;
  }
  if (numbers.length <= 6) {
    return numbers.replace(/(\d{2})(\d{0,4})/, '($1) $2');
  }
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

// Campos do formulário (definido como função para aceitar categorias dinâmicas)
const getEstablishmentFields = (categories = []) => {
  // Função para sanitizar ícones
  const sanitizeIcon = (icon) => {
    if (!icon || icon === '�' || icon.charCodeAt(0) === 65533) {
      return '🏪'; // ícone padrão de loja
    }
    return icon;
  };

  // Se não há categorias, criar algumas padrão
  const categoryOptions = categories.length > 0 
    ? categories.map(cat => {
        const cleanIcon = sanitizeIcon(cat.icon);
        return {
          value: cat.id.toString(),
          label: cat.name,
          icon: cleanIcon
        };
      })
    : [
        { value: 'temp_1', label: 'Restaurante', icon: '🍽️' },
        { value: 'temp_2', label: 'Supermercado', icon: '🛒' },
        { value: 'temp_3', label: 'Farmácia', icon: '💊' },
        { value: 'temp_4', label: 'Posto de Combustível', icon: '⛽' }
      ];

  return [
    {
      name: 'name',
      type: 'text',
      label: 'Nome do Estabelecimento',
      placeholder: 'Ex: Restaurante Central, Farmácia São João',
      icon: 'store',
      maxLength: 100
    },
    {
      name: 'categories',
      type: 'multiselect',
      label: 'Categorias (opcional)',
      options: categoryOptions
    },
  {
    name: 'street',
    type: 'text',
    label: 'Rua/Avenida',
    placeholder: 'Nome da rua',
    icon: 'road'
  },
  {
    name: 'number',
    type: 'text',
    label: 'Número',
    placeholder: '123',
    icon: 'numeric',
    keyboardType: 'numeric'
  },
  {
    name: 'district',
    type: 'text',
    label: 'Bairro',
    placeholder: 'Nome do bairro',
    icon: 'home-city'
  },
  {
    name: 'city',
    type: 'text',
    label: 'Cidade',
    placeholder: 'Nome da cidade',
    icon: 'city'
  },
  {
    name: 'state',
    type: 'text',
    label: 'Estado',
    placeholder: 'Estado',
    icon: 'map',
    maxLength: 20
  },
  {
    name: 'zipcode',
    type: 'text',
    label: 'CEP',
    placeholder: '00000-000',
    icon: 'mailbox',
    keyboardType: 'numeric',
    maxLength: 9,
    formatter: formatCEP
  },
  {
    name: 'phone',
    type: 'text',
    label: 'Telefone',
    placeholder: '(00) 00000-0000',
    icon: 'phone',
    keyboardType: 'phone-pad',
    maxLength: 15,
    formatter: formatPhone
  }
  ];
};

// Validações do formulário
const validationRules = {
  name: {
    required: true,
    minLength: 2,
    minLengthMessage: 'Nome deve ter pelo menos 2 caracteres'
  },
  categories: {
    required: false,
    custom: (value) => {
      // Campo opcional - sem validação obrigatória
      return '';
    }
  },
  phone: {
    custom: (value) => {
      if (!value || value.trim() === '') {
        return ''; // Campo opcional - sem erro se vazio
      }
      const phonePattern = /^\(\d{2}\) \d{4,5}-\d{4}$/;
      if (!phonePattern.test(value)) {
        return 'Use o formato (11) 99999-9999';
      }
      return '';
    }
  },
  zipcode: {
    custom: (value) => {
      if (!value || value.trim() === '') {
        return ''; // Campo opcional - sem erro se vazio
      }
      const zipPattern = /^\d{5}-\d{3}$/;
      if (!zipPattern.test(value)) {
        return 'Use o formato 00000-000';
      }
      return '';
    }
  }
};

export default function EstablishmentForm({ visible, establishment, onClose, onSaved }) {
  const db = useSQLiteContext();
  const { user } = useAuth();

  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationData, setLocationData] = useState({
    latitude: establishment?.latitude || null,
    longitude: establishment?.longitude || null
  });
  const [categories, setCategories] = useState([]);

  // Carrega categorias quando o componente monta
  React.useEffect(() => {
    if (db && user) {
      loadCategories();
    }
  }, [db, user]);

  const loadCategories = async () => {
    try {
      // Query defensiva - tenta carregar da nova tabela establishment_categories
      let results = [];
      
      try {
        results = await db.getAllAsync(`
          SELECT * FROM establishment_categories 
          WHERE user_id = ?
          ORDER BY name ASC
        `, [user.id]);
      } catch (tableError) {
        console.log('⚠️ Tabela establishment_categories não existe, usando fallback');
        
        // Fallback para tabela categories (compatibilidade)
        try {
          results = await db.getAllAsync(`
            SELECT * FROM categories 
            WHERE user_id = ? OR user_id IS NULL
            ORDER BY name ASC
          `, [user.id]);
        } catch (fallbackError) {
          console.error('❌ Erro ao carregar categorias (fallback):', fallbackError);
          results = [];
        }
      }
      
      setCategories(results || []);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
      setCategories([]);
    }
  };

  // Função para obter localização GPS
  const getCurrentLocation = async () => {
    return new Promise(async (resolve, reject) => {
      setGettingLocation(true);

      try {
        console.log('📍 Solicitando permissão de localização...');

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permissão Negada',
            'Permissão de localização é necessária para obter o endereço automaticamente.',
            [{ text: 'Entendi' }]
          );
          reject(new Error('Permission denied'));
          return;
        }

        console.log('✅ Permissão concedida, obtendo localização...');

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000
        });

        const { latitude: lat, longitude: lng } = location.coords;
        console.log(`📍 Coordenadas obtidas: ${lat}, ${lng}`);

        setLocationData({ latitude: lat, longitude: lng });

        console.log('🔍 Fazendo geocoding reverso...');
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng
        });

        let locationInfo = {
          latitude: lat,
          longitude: lng
        };

        if (reverseGeocode && reverseGeocode.length > 0) {
          const geoLocation = reverseGeocode[0];
          console.log('📋 Dados detalhados da localização:', JSON.stringify(geoLocation, null, 2));

          locationInfo = {
            ...locationInfo,
            name: geoLocation.name || '',
            street: geoLocation.street || '',
            number: geoLocation.streetNumber || '',
            district: geoLocation.sublocality || geoLocation.district || geoLocation.subLocalityLevel1 || '',
            city: geoLocation.city || geoLocation.locality || geoLocation.subAdministrativeArea || '',
            state: geoLocation.region || geoLocation.administrativeArea || '',
            zipcode: geoLocation.postalCode || ''
          };

          Alert.alert(
            '✅ Localização Obtida!',
            `Coordenadas e endereço preenchidos automaticamente.\n\nLocal: ${locationInfo.city || 'Não identificado'}, ${locationInfo.state || 'N/A'}`,
            [{ text: 'Entendi' }]
          );
        } else {
          Alert.alert(
            'Localização Parcial',
            'Coordenadas GPS obtidas, mas não foi possível identificar o endereço automaticamente.',
            [{ text: 'Entendi' }]
          );
        }

        resolve(locationInfo);
      } catch (error) {
        console.error('❌ Erro ao obter localização:', error);
        
        let errorMessage = 'Não foi possível obter a localização.';
        if (error.code === 'E_LOCATION_TIMEOUT') {
          errorMessage = 'Tempo limite para obter localização. Tente novamente em local aberto.';
        } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
          errorMessage = 'GPS não disponível. Verifique se está ativado.';
        }

        Alert.alert('Erro de Localização', errorMessage, [{ text: 'Entendi' }]);
        reject(error);
      } finally {
        setGettingLocation(false);
      }
    });
  };

  // Função de salvamento
  const handleSave = async (formData) => {
    if (!user) {
      throw new Error('Você precisa estar logado para cadastrar estabelecimentos.');
    }

    const selectedCategoryIds = formData.categories || [];
    
    const data = {
      name: formData.name.trim(),
      street: formData.street?.trim() || null,
      number: formData.number?.trim() || null,
      district: formData.district?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state?.trim() || null,
      zipcode: formData.zipcode?.trim() || null,
      phone: formData.phone?.trim() || null,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      user_id: user.id
    };

    try {
      await db.execAsync('BEGIN TRANSACTION');
      
      let establishmentId;
      
      if (establishment?.id) {
        // Atualização
        await db.runAsync(
          `UPDATE establishments 
           SET name = ?, street = ?, number = ?, district = ?, 
               city = ?, state = ?, zipcode = ?, phone = ?, latitude = ?, longitude = ?,
               updated_at = datetime('now')
           WHERE id = ? AND user_id = ?`,
          [
            data.name,
            data.street,
            data.number,
            data.district,
            data.city,
            data.state,
            data.zipcode,
            data.phone,
            data.latitude,
            data.longitude,
            establishment.id,
            user.id
          ]
        );
        
        establishmentId = establishment.id;
        
        // Remove categorias antigas
        await db.runAsync(
          'DELETE FROM establishment_category WHERE establishment_id = ? AND user_id = ?',
          [establishmentId, user.id]
        );
        
        console.log('✅ Estabelecimento atualizado:', establishment.id);
      } else {
        // Inserção
        const result = await db.runAsync(
          `INSERT INTO establishments 
           (name, street, number, district, city, state, zipcode, phone, latitude, longitude, user_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.name,
            data.street,
            data.number,
            data.district,
            data.city,
            data.state,
            data.zipcode,
            data.phone,
            data.latitude,
            data.longitude,
            data.user_id
          ]
        );
        
        establishmentId = result.lastInsertRowId;
        console.log('✅ Novo estabelecimento criado com ID:', establishmentId);
      }
      
      // Insere as novas categorias na tabela intermediária (se houver)
      if (selectedCategoryIds.length > 0) {
        let validCategoryIds = [];
        
        // Verifica quais categorias existem na tabela correta
        for (const categoryId of selectedCategoryIds) {
          try {
            // Tenta verificar se existe na nova tabela establishment_categories
            const categoryExists = await db.getFirstAsync(
              'SELECT id FROM establishment_categories WHERE id = ? AND user_id = ?',
              [parseInt(categoryId), user.id]
            );
            
            if (categoryExists) {
              validCategoryIds.push(parseInt(categoryId));
            } else {
              // Se não existe na nova tabela, verifica na antiga (fallback)
              const oldCategoryExists = await db.getFirstAsync(
                'SELECT id FROM categories WHERE id = ? AND user_id = ?',
                [parseInt(categoryId), user.id]
              );
              
              if (oldCategoryExists) {
                validCategoryIds.push(parseInt(categoryId));
              } else {
                console.log(`⚠️ Categoria ID ${categoryId} não encontrada, ignorando`);
              }
            }
          } catch (error) {
            console.log(`⚠️ Erro ao verificar categoria ID ${categoryId}, ignorando:`, error.message);
          }
        }
        
        // Insere apenas categorias válidas
        for (const categoryId of validCategoryIds) {
          await db.runAsync(
            `INSERT INTO establishment_category (establishment_id, category_id, user_id) 
             VALUES (?, ?, ?)`,
            [establishmentId, categoryId, user.id]
          );
        }
        
        console.log(`✅ ${validCategoryIds.length} categorias válidas vinculadas ao estabelecimento`);
        
        if (selectedCategoryIds.length > validCategoryIds.length) {
          const invalidCount = selectedCategoryIds.length - validCategoryIds.length;
          console.log(`⚠️ ${invalidCount} categoria(s) ignorada(s) por não existirem`);
        }
      } else {
        console.log('ℹ️ Estabelecimento salvo sem categorias');
      }
      
      await db.execAsync('COMMIT');

      // Notifica listeners globais
      if (global.expenseListeners) {
        global.expenseListeners.forEach(listener => listener());
      }

      if (onSaved) onSaved();
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('❌ Erro ao salvar estabelecimento:', error);
      throw new Error('Não foi possível salvar o estabelecimento. Tente novamente.');
    }
  };

  // Obtém campos do formulário com categorias carregadas
  const establishmentFields = getEstablishmentFields(categories);
  
  // Adiciona helper dinâmico no campo street
  const streetField = establishmentFields.find(field => field.name === 'street');
  if (streetField) {
    streetField.helper = gettingLocation ? 'Obtendo localização...' : 'Use o botão GPS para preenchimento automático';
  }

  // Estado para categorias do estabelecimento atual
  const [establishmentCategories, setEstablishmentCategories] = useState([]);

  // Carrega categorias do estabelecimento quando editando
  React.useEffect(() => {
    if (establishment?.id && db && user) {
      loadEstablishmentCategories();
    }
  }, [establishment?.id, db, user]);

  const loadEstablishmentCategories = async () => {
    try {
      const results = await db.getAllAsync(`
        SELECT category_id FROM establishment_category 
        WHERE establishment_id = ? AND user_id = ?
      `, [establishment.id, user.id]);
      
      const categoryIds = results.map(row => row.category_id.toString());
      setEstablishmentCategories(categoryIds);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias do estabelecimento:', error);
      setEstablishmentCategories([]);
    }
  };

  // Valores iniciais do formulário
  const initialValues = {
    name: establishment?.name || '',
    categories: establishment?.id ? establishmentCategories : [],
    street: establishment?.street || '',
    number: establishment?.number || '',
    district: establishment?.district || '',
    city: establishment?.city || '',
    state: establishment?.state || '',
    zipcode: establishment?.zipcode || '',
    phone: establishment?.phone || ''
  };


  return (
    <ModalForm
      visible={visible}
      onClose={onClose}
      onSubmit={handleSave}
      title={establishment?.id ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
      subtitle={establishment?.id ? 'Atualize as informações' : 'Preencha os dados do estabelecimento'}
      fields={establishmentFields}
      validationRules={validationRules}
      initialValues={initialValues}
      submitText={establishment?.id ? 'Atualizar' : 'Salvar'}
      cancelText='Cancelar'
    />
  );
}

