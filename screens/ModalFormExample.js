// screens/ModalFormExample.js - EXEMPLO DE USO DO MODAL FORM
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ModalForm from '../components/ModalForm';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

export default function ModalFormExample() {
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Exemplo 1: Formulário de Contato
  const contactFields = [
    {
      name: 'name',
      type: 'text',
      label: 'Nome Completo',
      placeholder: 'Digite seu nome',
      icon: 'account',
      autoCapitalize: 'words'
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'seu@email.com',
      icon: 'email',
      keyboardType: 'email-address',
      autoCapitalize: 'none'
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Telefone',
      placeholder: '(11) 99999-9999',
      icon: 'phone',
      keyboardType: 'phone-pad'
    },
    {
      name: 'subject',
      type: 'select',
      label: 'Assunto',
      options: [
        { value: 'support', label: 'Suporte', icon: 'help-circle' },
        { value: 'feedback', label: 'Feedback', icon: 'message-text' },
        { value: 'bug', label: 'Reportar Bug', icon: 'bug' },
        { value: 'feature', label: 'Sugestão', icon: 'lightbulb' }
      ]
    },
    {
      name: 'message',
      type: 'text',
      label: 'Mensagem',
      placeholder: 'Digite sua mensagem aqui...',
      multiline: true,
      numberOfLines: 4,
      maxLength: 500,
      helper: 'Máximo de 500 caracteres'
    },
    {
      name: 'newsletter',
      type: 'switch',
      label: 'Receber novidades',
      description: 'Receba atualizações e ofertas por email'
    }
  ];

  const contactValidation = {
    name: {
      required: true,
      minLength: 3,
      minLengthMessage: 'Nome deve ter pelo menos 3 caracteres'
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'Digite um email válido'
    },
    phone: {
      required: true,
      pattern: /^\(\d{2}\) \d{4,5}-\d{4}$/,
      patternMessage: 'Use o formato (11) 99999-9999'
    },
    subject: {
      required: true
    },
    message: {
      required: true,
      minLength: 10,
      minLengthMessage: 'Mensagem deve ter pelo menos 10 caracteres'
    }
  };

  // Exemplo 2: Formulário de Nova Despesa
  const expenseFields = [
    {
      name: 'description',
      type: 'text',
      label: 'Descrição',
      placeholder: 'Ex: Almoço no restaurante',
      icon: 'text'
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Valor',
      placeholder: '0,00',
      icon: 'currency-brl',
      keyboardType: 'decimal-pad'
    },
    {
      name: 'category',
      type: 'select',
      label: 'Categoria',
      options: [
        { value: 'food', label: 'Alimentação', icon: 'food' },
        { value: 'transport', label: 'Transporte', icon: 'car' },
        { value: 'health', label: 'Saúde', icon: 'hospital' },
        { value: 'education', label: 'Educação', icon: 'school' },
        { value: 'entertainment', label: 'Lazer', icon: 'gamepad' },
        { value: 'shopping', label: 'Compras', icon: 'shopping' }
      ]
    },
    {
      name: 'paymentMethod',
      type: 'select',
      label: 'Forma de Pagamento',
      options: [
        { value: 'cash', label: 'Dinheiro', icon: 'cash' },
        { value: 'credit', label: 'Crédito', icon: 'credit-card' },
        { value: 'debit', label: 'Débito', icon: 'credit-card-outline' },
        { value: 'pix', label: 'PIX', icon: 'qrcode' }
      ]
    },
    {
      name: 'notes',
      type: 'text',
      label: 'Observações (opcional)',
      placeholder: 'Adicione detalhes...',
      multiline: true,
      numberOfLines: 3
    },
    {
      name: 'recurring',
      type: 'switch',
      label: 'Despesa Recorrente',
      description: 'Esta despesa se repete mensalmente',
      icon: 'repeat'
    }
  ];

  const expenseValidation = {
    description: {
      required: true,
      minLength: 3
    },
    amount: {
      required: true,
      custom: (value) => {
        const num = parseFloat(value.replace(',', '.'));
        if (isNaN(num) || num <= 0) {
          return 'Digite um valor válido maior que zero';
        }
        return '';
      }
    },
    category: {
      required: true,
      requiredMessage: 'Selecione uma categoria'
    },
    paymentMethod: {
      required: true,
      requiredMessage: 'Selecione a forma de pagamento'
    }
  };

  // Exemplo 3: Formulário de Configurações
  const settingsFields = [
    {
      name: 'notifications',
      type: 'switch',
      label: 'Notificações',
      description: 'Receba lembretes de suas despesas',
      icon: 'bell'
    },
    {
      name: 'darkMode',
      type: 'switch',
      label: 'Modo Escuro',
      description: 'Ative o tema escuro do aplicativo',
      icon: 'theme-light-dark'
    },
    {
      name: 'currency',
      type: 'select',
      label: 'Moeda',
      options: [
        { value: 'BRL', label: 'Real (R$)', icon: 'currency-brl' },
        { value: 'USD', label: 'Dólar ($)', icon: 'currency-usd' },
        { value: 'EUR', label: 'Euro (€)', icon: 'currency-eur' }
      ]
    },
    {
      name: 'language',
      type: 'select',
      label: 'Idioma',
      options: [
        { value: 'pt-BR', label: 'Português', icon: 'flag' },
        { value: 'en-US', label: 'English', icon: 'flag-variant' },
        { value: 'es-ES', label: 'Español', icon: 'flag-variant-outline' }
      ]
    },
    {
      name: 'backup',
      type: 'switch',
      label: 'Backup Automático',
      description: 'Faça backup dos seus dados na nuvem',
      icon: 'cloud-upload'
    },
    {
      name: 'password',
      type: 'password',
      label: 'Nova Senha (opcional)',
      placeholder: 'Digite para alterar',
      icon: 'lock',
      helper: 'Deixe em branco para manter a senha atual'
    }
  ];

  const handleContactSubmit = async (data) => {
    console.log('Dados do formulário de contato:', data);
    
    // Simula envio
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    Alert.alert(
      'Sucesso!',
      'Sua mensagem foi enviada com sucesso.',
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  const handleExpenseSubmit = async (data) => {
    console.log('Dados da nova despesa:', data);
    
    // Simula salvamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    Alert.alert(
      'Despesa Adicionada',
      `Despesa de ${data.amount} foi registrada com sucesso!`,
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  const handleSettingsSubmit = async (data) => {
    console.log('Configurações atualizadas:', data);
    
    // Simula salvamento
    await new Promise(resolve => setTimeout(resolve, 800));
    
    Alert.alert(
      'Configurações Salvas',
      'Suas preferências foram atualizadas.',
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={NUBANK_COLORS.GRADIENT_PRIMARY}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Exemplos de Modal Form</Text>
        <Text style={styles.headerSubtitle}>
          Toque nos botões para ver diferentes tipos de formulários
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Card 1: Formulário de Contato */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => setContactModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, { backgroundColor: `${NUBANK_COLORS.INFO}20` }]}>
            <MaterialCommunityIcons
              name="message-text"
              size={28}
              color={NUBANK_COLORS.INFO}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Formulário de Contato</Text>
            <Text style={styles.cardDescription}>
              Exemplo com validação de email, telefone e campos obrigatórios
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={NUBANK_COLORS.TEXT_TERTIARY}
          />
        </TouchableOpacity>

        {/* Card 2: Nova Despesa */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => setExpenseModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, { backgroundColor: `${NUBANK_COLORS.SUCCESS}20` }]}>
            <MaterialCommunityIcons
              name="cash"
              size={28}
              color={NUBANK_COLORS.SUCCESS}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Nova Despesa</Text>
            <Text style={styles.cardDescription}>
              Formulário com seleção de categoria, valor monetário e switches
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={NUBANK_COLORS.TEXT_TERTIARY}
          />
        </TouchableOpacity>

        {/* Card 3: Configurações */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => setSettingsModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, { backgroundColor: `${NUBANK_COLORS.WARNING}20` }]}>
            <MaterialCommunityIcons
              name="cog"
              size={28}
              color={NUBANK_COLORS.WARNING}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Configurações</Text>
            <Text style={styles.cardDescription}>
              Exemplo com switches, seleções e campo de senha
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={NUBANK_COLORS.TEXT_TERTIARY}
          />
        </TouchableOpacity>

        {/* Informações adicionais */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="information"
            size={20}
            color={NUBANK_COLORS.PRIMARY}
          />
          <Text style={styles.infoText}>
            O componente ModalForm é totalmente customizável e reutilizável.
            Ele suporta diferentes tipos de campos, validação em tempo real,
            animações suaves e feedback visual seguindo o design Nubank.
          </Text>
        </View>
      </View>

      {/* Modais */}
      <ModalForm
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
        onSubmit={handleContactSubmit}
        title="Entre em Contato"
        subtitle="Preencha o formulário e entraremos em contato"
        fields={contactFields}
        validationRules={contactValidation}
        submitText="Enviar Mensagem"
        cancelText="Cancelar"
      />

      <ModalForm
        visible={expenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onSubmit={handleExpenseSubmit}
        title="Nova Despesa"
        subtitle="Registre seus gastos de forma rápida"
        fields={expenseFields}
        validationRules={expenseValidation}
        submitText="Adicionar Despesa"
        cancelText="Cancelar"
        initialValues={{
          recurring: false
        }}
      />

      <ModalForm
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onSubmit={handleSettingsSubmit}
        title="Configurações"
        subtitle="Personalize sua experiência"
        fields={settingsFields}
        submitText="Salvar Configurações"
        cancelText="Cancelar"
        initialValues={{
          notifications: true,
          darkMode: false,
          currency: 'BRL',
          language: 'pt-BR',
          backup: true
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND
  },
  
  header: {
    paddingTop: 60,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingBottom: NUBANK_SPACING.XL
  },
  
  headerTitle: {
    fontSize: NUBANK_FONT_SIZES.XXL,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_WHITE,
    marginBottom: NUBANK_SPACING.SM
  },
  
  headerSubtitle: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_WHITE,
    opacity: 0.9
  },
  
  content: {
    padding: NUBANK_SPACING.LG
  },
  
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.CARD_BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.LG,
    marginBottom: NUBANK_SPACING.MD,
    ...NUBANK_SHADOWS.MD
  },
  
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: NUBANK_SPACING.MD
  },
  
  cardContent: {
    flex: 1
  },
  
  cardTitle: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.XS
  },
  
  cardDescription: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    lineHeight: 20
  },
  
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${NUBANK_COLORS.PRIMARY}10`,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    padding: NUBANK_SPACING.MD,
    marginTop: NUBANK_SPACING.LG
  },
  
  infoText: {
    flex: 1,
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    lineHeight: 20,
    marginLeft: NUBANK_SPACING.SM
  }
});