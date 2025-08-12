import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

const { width: screenWidth } = Dimensions.get('window');

export const FadeInView = ({ children, delay = 0, duration = 500, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true
    }).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

export const SlideInView = ({ children, delay = 0, duration = 400, from = 'bottom', style }) => {
  const slideAnim = useRef(
    new Animated.Value(from === 'bottom' ? 50 : from === 'right' ? screenWidth : -screenWidth)
  ).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration,
      delay,
      useNativeDriver: true
    }).start();
  }, []);

  const translateStyle =
    from === 'bottom'
      ? { translateY: slideAnim }
      : from === 'right'
        ? { translateX: slideAnim }
        : { translateX: slideAnim };

  return (
    <Animated.View style={[{ transform: [translateStyle] }, style]}>
      {children}
    </Animated.View>
  );
};

export const ScaleButton = ({ children, onPress, style, disabled = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const SwipeableCard = ({ children, onSwipe, style }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handleSwipe = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      if (onSwipe) onSwipe();
    });
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateX }],
          opacity
        },
        style
      ]}
    >
      {children}
      <TouchableOpacity
        style={styles.deleteSwipeButton}
        onPress={handleSwipe}
      >
        <MaterialCommunityIcons name="delete" size={20} color={NUBANK_COLORS.TEXT_WHITE} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PulseView = ({ children, style, duration = 1500 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: duration / 2,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true
        })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ scale: pulseAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

export const SkeletonLoader = ({ width = '100%', height = 20, borderRadius = 4, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth]
  });

  return (
    <View style={[styles.skeletonContainer, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }]
          }
        ]}
      />
    </View>
  );
};

export const FloatingActionButton = ({ onPress, icon = 'plus', style }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <ScaleButton onPress={onPress} style={[styles.fabContainer, style]}>
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [{ scale: scaleAnim }, { rotate: rotation }]
          }
        ]}
      >
        <MaterialCommunityIcons name={icon} size={24} color={NUBANK_COLORS.TEXT_WHITE} />
      </Animated.View>
    </ScaleButton>
  );
};

export const AnimatedCard = ({ children, delay = 0, style }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim
        },
        style
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  deleteSwipeButton: {
    position: 'absolute',
    right: NUBANK_SPACING.MD,
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: NUBANK_COLORS.ERROR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  skeletonContainer: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    overflow: 'hidden'
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  fabContainer: {
    position: 'absolute',
    bottom: NUBANK_SPACING.XL,
    right: NUBANK_SPACING.XL
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NUBANK_COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    ...NUBANK_SHADOWS.LARGE
  },
  card: {
    backgroundColor: NUBANK_COLORS.SURFACE,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.LG,
    marginBottom: NUBANK_SPACING.MD,
    ...NUBANK_SHADOWS.MEDIUM
  }
});

export default {
  FadeInView,
  SlideInView,
  ScaleButton,
  SwipeableCard,
  PulseView,
  SkeletonLoader,
  FloatingActionButton,
  AnimatedCard
};