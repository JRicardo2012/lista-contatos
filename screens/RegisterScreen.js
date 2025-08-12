// screens/RegisterScreen.js - DESIGN NUBANK
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Animated
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animações
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const handleRegister = async () => {
    // Validações
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (result.success) {
      Alert.alert('Cadastro Realizado!', 'Sua conta foi criada com sucesso.', [
        { text: 'Entendi' }
      ]);
    } else {
      if (result.error?.includes('UNIQUE constraint failed')) {
        Alert.alert('Erro', 'Este email já está cadastrado');
      } else {
        Alert.alert('Erro', result.error || 'Erro ao criar conta');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor={NUBANK_COLORS.PRIMARY} />

      <LinearGradient
        colors={[NUBANK_COLORS.PRIMARY, NUBANK_COLORS.PRIMARY_DARK]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Header com botão voltar */}
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons
                  name='arrow-left'
                  size={24}
                  color={NUBANK_COLORS.TEXT_WHITE}
                />
              </TouchableOpacity>

              {/* Logo */}
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <MaterialCommunityIcons
                    name='account-plus'
                    size={48}
                    color={NUBANK_COLORS.TEXT_WHITE}
                  />
                </View>
                <Text style={styles.appName}>Criar conta</Text>
              </View>

              {/* Formulário */}
              <View style={styles.formContainer}>
                <Text style={styles.welcomeText}>Vamos começar</Text>
                <Text style={styles.subtitleText}>Preencha os dados abaixo</Text>

                {/* Nome */}
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name='account-outline'
                    size={20}
                    color={NUBANK_COLORS.TEXT_TERTIARY}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder='Nome completo'
                    placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize='words'
                    autoCorrect={false}
                  />
                </View>

                {/* Email */}
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name='email-outline'
                    size={20}
                    color={NUBANK_COLORS.TEXT_TERTIARY}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder='E-mail'
                    placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType='email-address'
                    autoCapitalize='none'
                    autoCorrect={false}
                  />
                </View>

                {/* Senha */}
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name='lock-outline'
                    size={20}
                    color={NUBANK_COLORS.TEXT_TERTIARY}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder='Senha'
                    placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize='none'
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={NUBANK_COLORS.TEXT_TERTIARY}
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirmar Senha */}
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name='lock-check-outline'
                    size={20}
                    color={NUBANK_COLORS.TEXT_TERTIARY}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder='Confirmar senha'
                    placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize='none'
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    <MaterialCommunityIcons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={NUBANK_COLORS.TEXT_TERTIARY}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.passwordHint}>A senha deve ter pelo menos 6 caracteres</Text>

                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={NUBANK_COLORS.TEXT_WHITE} />
                  ) : (
                    <Text style={styles.registerButtonText}>Criar conta</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Já tem uma conta?</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginLink}> Fazer login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  gradient: {
    flex: 1
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: NUBANK_SPACING.LG
  },

  // Botão voltar
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: NUBANK_SPACING.LG,
    zIndex: 1,
    padding: NUBANK_SPACING.SM
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.XL,
    marginTop: NUBANK_SPACING.XL
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${NUBANK_COLORS.TEXT_WHITE}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.MD
  },
  appName: {
    fontSize: NUBANK_FONT_SIZES.XXL,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_WHITE,
    textAlign: 'center'
  },

  // Formulário
  formContainer: {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.XL,
    padding: NUBANK_SPACING.XL,
    ...NUBANK_SHADOWS.LG
  },
  welcomeText: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.XS
  },
  subtitleText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginBottom: NUBANK_SPACING.XL
  },

  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    marginBottom: NUBANK_SPACING.MD,
    paddingHorizontal: NUBANK_SPACING.MD,
    height: 56
  },
  inputIcon: {
    marginRight: NUBANK_SPACING.SM
  },
  input: {
    flex: 1,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    height: '100%'
  },
  eyeButton: {
    padding: NUBANK_SPACING.SM
  },

  // Dica de senha
  passwordHint: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginBottom: NUBANK_SPACING.LG,
    textAlign: 'center'
  },

  // Botão
  registerButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.XL
  },
  registerButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_WHITE
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  footerText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },
  loginLink: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
  }
});
