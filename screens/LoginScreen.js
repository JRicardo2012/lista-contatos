// screens/LoginScreen.js - DESIGN NUBANK
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

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      if (result.error.includes('Email não encontrado')) {
        Alert.alert('Email não cadastrado', 'Deseja criar uma nova conta?', [
          { text: 'Não', style: 'cancel' },
          { text: 'Sim', onPress: () => navigation.navigate('Register') }
        ]);
      } else if (result.error.includes('Senha incorreta')) {
        Alert.alert('Senha incorreta', 'Verifique sua senha e tente novamente');
      } else {
        Alert.alert('Erro', result.error);
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
              {/* Logo */}
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <MaterialCommunityIcons
                    name='cash-multiple'
                    size={48}
                    color={NUBANK_COLORS.TEXT_WHITE}
                  />
                </View>
                <Text style={styles.appName}>Controle Financeiro</Text>
              </View>

              {/* Formulário */}
              <View style={styles.formContainer}>
                <Text style={styles.welcomeText}>Bem-vindo de volta</Text>
                <Text style={styles.subtitleText}>Faça login para continuar</Text>

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

                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => Alert.alert('Em breve', 'Recuperação de senha será implementada')}
                >
                  <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={NUBANK_COLORS.TEXT_WHITE} />
                  ) : (
                    <Text style={styles.loginButtonText}>Entrar</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Não tem uma conta?</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerLink}> Cadastre-se</Text>
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

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.XXL
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

  // Esqueceu a senha
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: NUBANK_SPACING.XS,
    marginBottom: NUBANK_SPACING.LG
  },
  forgotPasswordText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },

  // Botão
  loginButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.XL
  },
  loginButtonText: {
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
  registerLink: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
  }
});
