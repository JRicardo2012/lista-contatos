import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Alert, 
  Platform,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  PixelRatio
} from "react-native";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";

// Obter dimensões da tela
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Sistema responsivo completo
const responsiveSystem = (() => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  return {
    // Detectar tipo de dispositivo
    isTablet: screenWidth >= 768,
    isSmallPhone: screenWidth < 360,
    isLargePhone: screenWidth > 400,
    hasNotch: screenHeight > 800 && Platform.OS === 'ios',
    
    // Calcular tamanhos responsivos
    scale: (size) => {
      const baseWidth = 375; // iPhone X como referência
      return Math.round(PixelRatio.roundToNearestPixel(screenWidth / baseWidth * size));
    },
    
    // Espaçamentos adaptativos
    spacing: {
      xs: Math.round(screenWidth * 0.01), // 1% da largura
      sm: Math.round(screenWidth * 0.02), // 2% da largura  
      md: Math.round(screenWidth * 0.04), // 4% da largura
      lg: Math.round(screenWidth * 0.06), // 6% da largura
      xl: Math.round(screenWidth * 0.08), // 8% da largura
    },
    
    // Tamanhos de fonte adaptativos
    fontSize: {
      small: Math.round(screenWidth * 0.032), // ~12px em 375px
      medium: Math.round(screenWidth * 0.037), // ~14px em 375px
      large: Math.round(screenWidth * 0.043), // ~16px em 375px
      xlarge: Math.round(screenWidth * 0.048), // ~18px em 375px
      xxlarge: Math.round(screenWidth * 0.053), // ~20px em 375px
      title: Math.round(screenWidth * 0.059), // ~22px em 375px
      header: Math.round(screenWidth * 0.064), // ~24px em 375px
    },
    
    // Altura do botão baseada na tela
    buttonHeight: Math.max(44, screenHeight * 0.06),
    
    // Padding do bottom baseado na altura da tela
    bottomPadding: Platform.select({
      ios: screenHeight > 800 ? screenHeight * 0.08 : screenHeight * 0.06,
      android: screenHeight > 700 ? screenHeight * 0.07 : screenHeight * 0.05,
    }),
    
    // Border radius adaptativo
    borderRadius: {
      small: Math.round(screenWidth * 0.02),
      medium: Math.round(screenWidth * 0.03),
      large: Math.round(screenWidth * 0.04),
    },
    
    // Detectar orientação
    isLandscape: screenWidth > screenHeight,
    
    // Calcular margens baseadas no tipo de tela
    margins: {
      horizontal: screenWidth < 360 ? 12 : screenWidth > 414 ? 20 : 16,
      vertical: screenHeight < 667 ? 4 : screenHeight > 812 ? 8 : 6,
    }
  };
})();

// Aplicar escala aos tamanhos
const rs = responsiveSystem;

// Migração do banco
async function applyMigrations(db) {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL
      );
    `);
    console.log("Banco criado com sucesso!");
  } catch (error) {
    console.error("Erro na migração:", error);
  }
}

// Componente principal
function ContactApp() {
  const db = useSQLiteContext();
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  // Estados do formulário
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Listener para mudanças de orientação
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Carregar contatos
  const loadContacts = async () => {
    if (!db) return;
    
    try {
      const result = await db.getAllAsync('SELECT * FROM users ORDER BY firstName');
      setContacts(result);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      setContacts([]);
    }
  };

  // Carregar contatos ao iniciar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (db) {
        loadContacts();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [db]);

  // Limpar formulário
  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setEditingContact(null);
  };

  // Abrir formulário para novo contato
  const openNewContactForm = () => {
    clearForm();
    setShowForm(true);
  };

  // Abrir formulário para editar
  const openEditForm = (contact) => {
    setFirstName(contact.firstName);
    setLastName(contact.lastName);
    setEmail(contact.email);
    setPhone(contact.phone);
    setEditingContact(contact);
    setShowForm(true);
  };

  // Fechar formulário
  const closeForm = () => {
    setShowForm(false);
    clearForm();
  };

  // Validar formulário
  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Erro', 'Sobrenome é obrigatório');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Erro', 'Email é obrigatório');
      return false;
    }
    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erro', 'Email inválido');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Erro', 'Telefone é obrigatório');
      return false;
    }
    // Validação de telefone
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      Alert.alert('Erro', 'Telefone deve ter 10 ou 11 dígitos');
      return false;
    }
    return true;
  };

  // Salvar contato
  const saveContact = async () => {
    if (!validateForm()) return;
    if (!db) {
      Alert.alert('Erro', 'Banco de dados não disponível');
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.toLowerCase().trim();
      
      if (editingContact) {
        // Verificar se email já existe (exceto o próprio registro)
        const existing = await db.getAllAsync(
          'SELECT id FROM users WHERE LOWER(email) = ? AND id != ?',
          [trimmedEmail, editingContact.id]
        );
        
        if (existing.length > 0) {
          Alert.alert('Erro', 'Este email já está cadastrado!');
          setLoading(false);
          return;
        }

        // Atualizar
        await db.runAsync(
          'UPDATE users SET firstName = ?, lastName = ?, email = ?, phone = ? WHERE id = ?',
          [firstName.trim(), lastName.trim(), trimmedEmail, phone, editingContact.id]
        );
        Alert.alert('Sucesso', 'Contato atualizado!');
      } else {
        // Verificar se email já existe
        const existing = await db.getAllAsync(
          'SELECT id FROM users WHERE LOWER(email) = ?',
          [trimmedEmail]
        );
        
        if (existing.length > 0) {
          Alert.alert('Erro', 'Este email já está cadastrado!');
          setLoading(false);
          return;
        }

        // Criar novo
        await db.runAsync(
          'INSERT INTO users (firstName, lastName, email, phone) VALUES (?, ?, ?, ?)',
          [firstName.trim(), lastName.trim(), trimmedEmail, phone]
        );
        Alert.alert('Sucesso', 'Contato salvo!');
      }
      
      // Aguardar um pouco antes de recarregar
      setTimeout(() => {
        loadContacts();
        closeForm();
      }, 100);
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      
      if (error.message.includes('UNIQUE constraint')) {
        Alert.alert('Erro', 'Este email já está cadastrado!');
      } else if (error.message.includes('closed resource')) {
        Alert.alert('Erro', 'Conexão com banco perdida. Tente novamente.');
      } else {
        Alert.alert('Erro', 'Não foi possível salvar o contato');
      }
    } finally {
      setLoading(false);
    }
  };

  // Excluir contato
  const deleteContact = (contact) => {
    Alert.alert(
      'Confirmar',
      `Excluir ${contact.firstName} ${contact.lastName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!db) {
              Alert.alert('Erro', 'Banco de dados não disponível');
              return;
            }
            
            try {
              await db.runAsync('DELETE FROM users WHERE id = ?', [contact.id]);
              Alert.alert('Sucesso', 'Contato excluído!');
              
              setTimeout(() => {
                loadContacts();
              }, 100);
              
            } catch (error) {
              console.error('Erro ao excluir:', error);
              if (!error.message.includes('closed resource')) {
                Alert.alert('Erro', 'Não foi possível excluir');
              }
            }
          }
        }
      ]
    );
  };

  // Formatar telefone
  const formatPhone = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return text;
  };

  // Renderizar item da lista
  const renderContact = ({ item }) => (
    <View style={[
      styles.contactItem,
      responsiveSystem.isTablet && { 
        marginHorizontal: responsiveSystem.spacing.xl,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%'
      }
    ]}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.contactEmail}>{item.email}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={[
        styles.contactActions,
        responsiveSystem.isLandscape && !responsiveSystem.isTablet && {
          flexDirection: 'row',
          gap: responsiveSystem.spacing.lg,
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.editButton,
            responsiveSystem.isSmallPhone && { paddingVertical: responsiveSystem.spacing.sm }
          ]}
          onPress={() => openEditForm(item)}
        >
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.deleteButton,
            responsiveSystem.isSmallPhone && { paddingVertical: responsiveSystem.spacing.sm }
          ]}
          onPress={() => deleteContact(item)}
        >
          <Text style={styles.buttonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Tela do formulário
  if (showForm) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar 
          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'dark-content'}
          backgroundColor={Platform.OS === 'android' ? '#ffffff' : undefined}
        />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={closeForm}>
            <Text style={styles.backButtonIcon}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {editingContact ? 'Editar Contato' : 'Novo Contato'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[
          styles.form,
          responsiveSystem.isTablet && {
            maxWidth: 500,
            alignSelf: 'center',
            width: '100%'
          }
        ]}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={[
                styles.input,
                responsiveSystem.isSmallPhone && { fontSize: responsiveSystem.fontSize.medium }
              ]}
              placeholder="Digite o nome"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Sobrenome</Text>
            <TextInput
              style={[
                styles.input,
                responsiveSystem.isSmallPhone && { fontSize: responsiveSystem.fontSize.medium }
              ]}
              placeholder="Digite o sobrenome"
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[
                styles.input,
                responsiveSystem.isSmallPhone && { fontSize: responsiveSystem.fontSize.medium }
              ]}
              placeholder="exemplo@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Telefone</Text>
            <TextInput
              style={[
                styles.input,
                responsiveSystem.isSmallPhone && { fontSize: responsiveSystem.fontSize.medium }
              ]}
              placeholder="(11) 99999-9999"
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              keyboardType="phone-pad"
              maxLength={15}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={saveContact}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editingContact ? 'Atualizar' : 'Salvar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={closeForm}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Tela da lista
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'dark-content'}
        backgroundColor={Platform.OS === 'android' ? '#ffffff' : undefined}
      />
      <View style={styles.header}>
        <Text style={styles.title}>Lista de Contatos</Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderContact}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          responsiveSystem.isTablet && {
            paddingHorizontal: responsiveSystem.spacing.xl * 2,
            alignItems: 'center'
          }
        ]}
        numColumns={responsiveSystem.isTablet && responsiveSystem.isLandscape ? 2 : 1}
        key={responsiveSystem.isTablet && responsiveSystem.isLandscape ? 'landscape' : 'portrait'}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={styles.emptyText}>Nenhum contato cadastrado</Text>
            <Text style={styles.emptySubtext}>
              Toque no botão "Adicionar Contato" para{'\n'}começar a organizar seus contatos
            </Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={[
          styles.addButton,
          responsiveSystem.isTablet && {
            position: 'relative',
            marginTop: responsiveSystem.spacing.lg,
            marginBottom: responsiveSystem.spacing.xl,
            bottom: 'auto',
            left: 'auto',
            right: 'auto',
            maxWidth: 400,
            alignSelf: 'center'
          }
        ]} 
        onPress={openNewContactForm}
      >
        <Text style={styles.addButtonText}>+ Adicionar Contato</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Componente com provider
export default function App() {
  return (
    <SQLiteProvider databaseName="contacts.db" onInit={applyMigrations}>
      <ContactApp />
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? '#f2f2f7' : '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? rs.spacing.xl : rs.spacing.xl + rs.spacing.md,
    paddingHorizontal: rs.spacing.lg,
    paddingBottom: rs.spacing.lg,
    backgroundColor: Platform.OS === 'ios' ? '#f9f9f9' : '#ffffff',
    borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0,
    borderBottomColor: Platform.OS === 'ios' ? '#c6c6c8' : 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.1,
        shadowRadius: 0,
      },
      android: {
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: rs.scale(2) },
        shadowOpacity: 0.06,
        shadowRadius: rs.scale(8),
        elevation: 3,
      },
    }),
  },
  backButton: {
    width: rs.scale(44),
    height: rs.scale(44),
    backgroundColor: Platform.OS === 'ios' ? '#f2f2f7' : '#f8fafc',
    borderRadius: rs.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs.spacing.sm,
    ...Platform.select({
      ios: {
        borderWidth: 0,
      },
      android: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
      },
    }),
  },
  backButtonIcon: {
    fontSize: rs.scale(20),
    color: Platform.OS === 'ios' ? '#007aff' : '#475569',
    fontWeight: Platform.OS === 'ios' ? '400' : '300',
  },
  headerSpacer: {
    width: rs.scale(44),
    marginLeft: rs.spacing.sm,
  },
  title: {
    fontSize: rs.fontSize.header,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    color: Platform.OS === 'ios' ? '#000000' : '#1e293b',
    flex: 1,
    textAlign: 'center',
    letterSpacing: Platform.OS === 'ios' ? -0.3 : -0.5,
  },
  list: {
    flex: 1,
    paddingBottom: rs.spacing.md,
  },
  listContent: {
    paddingBottom: rs.bottomPadding + rs.buttonHeight + rs.spacing.xl,
    paddingTop: rs.spacing.md,
    paddingHorizontal: rs.isTablet ? rs.spacing.xl : rs.spacing.xs,
  },
  contactItem: {
    backgroundColor: '#ffffff',
    padding: rs.spacing.lg,
    marginHorizontal: rs.spacing.md,
    marginVertical: rs.spacing.sm,
    borderRadius: rs.borderRadius.medium,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e5e5ea',
      },
      android: {
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: rs.scale(2) },
        shadowOpacity: 0.06,
        shadowRadius: rs.scale(8),
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
      },
    }),
  },
  contactInfo: {
    marginBottom: rs.spacing.md,
  },
  contactName: {
    fontSize: rs.fontSize.xlarge,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    color: Platform.OS === 'ios' ? '#000000' : '#1e293b',
    marginBottom: rs.spacing.sm,
    letterSpacing: Platform.OS === 'ios' ? -0.2 : -0.3,
  },
  contactEmail: {
    fontSize: rs.fontSize.medium,
    color: Platform.OS === 'ios' ? '#8e8e93' : '#64748b',
    marginBottom: rs.spacing.xs,
    fontWeight: Platform.OS === 'ios' ? '400' : '500',
  },
  contactPhone: {
    fontSize: rs.fontSize.medium,
    color: Platform.OS === 'ios' ? '#8e8e93' : '#64748b',
    fontWeight: Platform.OS === 'ios' ? '400' : '500',
  },
  contactActions: {
    flexDirection: 'row',
    gap: rs.spacing.md,
    marginTop: rs.spacing.sm,
  },
  editButton: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? '#34c759' : '#22c55e',
    paddingVertical: rs.spacing.md,
    borderRadius: rs.borderRadius.small,
    alignItems: 'center',
    minHeight: rs.scale(44),
    ...Platform.select({
      ios: {
        shadowColor: '#34c759',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: rs.scale(4) },
        shadowOpacity: 0.2,
        shadowRadius: rs.scale(8),
        elevation: 4,
      },
    }),
  },
  deleteButton: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? '#ff3b30' : '#ef4444',
    paddingVertical: rs.spacing.md,
    borderRadius: rs.borderRadius.small,
    alignItems: 'center',
    minHeight: rs.scale(44),
    ...Platform.select({
      ios: {
        shadowColor: '#ff3b30',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: rs.scale(4) },
        shadowOpacity: 0.2,
        shadowRadius: rs.scale(8),
        elevation: 4,
      },
    }),
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: rs.fontSize.medium,
    letterSpacing: Platform.OS === 'ios' ? 0 : 0.3,
  },
  addButton: {
    position: 'absolute',
    bottom: rs.bottomPadding,
    left: rs.spacing.lg,
    right: rs.spacing.lg,
    backgroundColor: Platform.OS === 'ios' ? '#007aff' : '#3b82f6',
    paddingVertical: rs.spacing.lg,
    borderRadius: rs.borderRadius.medium,
    alignItems: 'center',
    minHeight: rs.buttonHeight,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#007aff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: rs.scale(8) },
        shadowOpacity: 0.25,
        shadowRadius: rs.scale(16),
        elevation: 12,
      },
    }),
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: rs.fontSize.large,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    letterSpacing: Platform.OS === 'ios' ? 0 : 0.5,
  },
  form: {
    padding: rs.spacing.lg,
    flex: 1,
  },
  inputContainer: {
    marginBottom: rs.spacing.lg,
  },
  inputLabel: {
    fontSize: rs.fontSize.medium,
    fontWeight: Platform.OS === 'ios' ? '500' : '600',
    color: Platform.OS === 'ios' ? '#3c3c43' : '#374151',
    marginBottom: rs.spacing.sm,
    marginLeft: Platform.OS === 'ios' ? 0 : rs.spacing.xs,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: Platform.OS === 'ios' ? 1 : 2,
    borderColor: Platform.OS === 'ios' ? '#d1d1d6' : '#e5e7eb',
    borderRadius: rs.borderRadius.medium,
    paddingHorizontal: rs.spacing.md,
    paddingVertical: rs.spacing.md,
    fontSize: rs.fontSize.large,
    color: Platform.OS === 'ios' ? '#000000' : '#1f2937',
    minHeight: rs.scale(48),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        shadowColor: '#6b7280',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  saveButton: {
    backgroundColor: Platform.OS === 'ios' ? '#007aff' : '#3b82f6',
    paddingVertical: rs.spacing.lg,
    borderRadius: rs.borderRadius.medium,
    alignItems: 'center',
    marginBottom: rs.spacing.md,
    marginTop: rs.spacing.md,
    minHeight: rs.buttonHeight,
    ...Platform.select({
      ios: {
        shadowColor: '#007aff',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: rs.scale(6) },
        shadowOpacity: 0.25,
        shadowRadius: rs.scale(12),
        elevation: 6,
      },
    }),
  },
  disabledButton: {
    backgroundColor: Platform.OS === 'ios' ? '#c7c7cc' : '#9ca3af',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: rs.fontSize.large,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    letterSpacing: Platform.OS === 'ios' ? 0 : 0.5,
  },
  cancelButton: {
    backgroundColor: Platform.OS === 'ios' ? '#f2f2f7' : '#f8fafc',
    paddingVertical: rs.spacing.md,
    borderRadius: rs.borderRadius.medium,
    alignItems: 'center',
    borderWidth: Platform.OS === 'ios' ? 1 : 2,
    borderColor: Platform.OS === 'ios' ? '#d1d1d6' : '#e2e8f0',
    minHeight: rs.scale(48),
  },
  cancelButtonText: {
    color: Platform.OS === 'ios' ? '#007aff' : '#64748b',
    fontSize: rs.fontSize.large,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: rs.spacing.xl * 2,
    paddingHorizontal: rs.spacing.xl,
  },
  emptyIcon: {
    fontSize: rs.isTablet ? rs.scale(80) : rs.scale(56),
    marginBottom: rs.spacing.lg,
    opacity: Platform.OS === 'ios' ? 0.4 : 0.3,
  },
  emptyText: {
    fontSize: rs.fontSize.xlarge,
    color: Platform.OS === 'ios' ? '#8e8e93' : '#64748b',
    textAlign: 'center',
    fontWeight: Platform.OS === 'ios' ? '500' : '600',
    marginBottom: rs.spacing.sm,
  },
  emptySubtext: {
    fontSize: rs.fontSize.medium,
    color: Platform.OS === 'ios' ? '#c7c7cc' : '#9ca3af',
    textAlign: 'center',
    lineHeight: rs.fontSize.medium * 1.4,
  },
});