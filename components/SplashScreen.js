// components/SplashScreen.js - VERSÃO CORRIGIDA
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  // Animações
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current; // NOVA animação para progresso
  
  // Círculos de fundo
  const circle1Scale = useRef(new Animated.Value(0)).current;
  const circle2Scale = useRef(new Animated.Value(0)).current;
  const circle3Scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequência de animações
    Animated.parallel([
      // Logo aparece com scale e fade
      Animated.sequence([
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 10,
            friction: 2,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        // Pulso infinito suave
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
      ]),
      
      // Título aparece após 500ms
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslate, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
      
      // Animação da barra de progresso
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ),
      
      // Círculos de fundo com timing diferente
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(circle1Scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(circle2Scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(circle3Scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      
      // Rotação suave contínua
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 30000,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      {/* Gradiente de fundo */}
      <View style={styles.gradient} />
      
      {/* Círculos animados de fundo */}
      <Animated.View
        style={[
          styles.backgroundCircle,
          styles.circle1,
          {
            transform: [
              { scale: circle1Scale },
              { rotate: rotation },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundCircle,
          styles.circle2,
          {
            transform: [
              { scale: circle2Scale },
              { rotate: rotation },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundCircle,
          styles.circle3,
          {
            transform: [{ scale: circle3Scale }],
          },
        ]}
      />
      
      {/* Logo animado */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [
              { scale: Animated.multiply(logoScale, pulseAnim) },
            ],
          },
        ]}
      >
        <Text style={styles.logo}>💰</Text>
        
        {/* Brilho animado */}
        <Animated.View
          style={[
            styles.shine,
            {
              transform: [
                {
                  translateX: pulseAnim.interpolate({
                    inputRange: [1, 1.1],
                    outputRange: [-50, 50],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
      
      {/* Título animado */}
      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslate }],
          },
        ]}
      >
        <Text style={styles.title}>Controle Financeiro</Text>
        <Text style={styles.subtitle}>Suas finanças em suas mãos</Text>
      </Animated.View>
      
      {/* Indicador de carregamento CORRIGIDO */}
      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: titleOpacity,
          },
        ]}
      >
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingProgress,
              {
                transform: [{
                  scaleX: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.7],
                  })
                }],
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Carregando...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: width * 1.5,
    height: width * 1.5,
    top: -width * 0.5,
    left: -width * 0.25,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  circle2: {
    width: width * 1.2,
    height: width * 1.2,
    bottom: -width * 0.4,
    right: -width * 0.3,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  circle3: {
    width: width * 0.8,
    height: width * 0.8,
    top: height * 0.1,
    right: -width * 0.2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 90,
    marginBottom: 40,
    overflow: 'hidden',
  },
  logo: {
    fontSize: 120,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 20,
    height: '100%',
    transform: [{ skewX: '-20deg' }],
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingProgress: {
    height: '100%',
    width: '100%', // Largura fixa
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    transformOrigin: 'left', // Escala a partir da esquerda
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});