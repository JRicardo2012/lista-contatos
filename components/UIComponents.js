import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Vibration
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

export const Chip = ({ 
  label, 
  icon, 
  selected = false, 
  onPress, 
  color = NUBANK_COLORS.PRIMARY,
  style 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true
      })
    ]).start();
    
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.chip,
          selected && [styles.chipSelected, { backgroundColor: color }],
          { transform: [{ scale: scaleAnim }] },
          style
        ]}
      >
        {icon && <Text style={styles.chipIcon}>{icon}</Text>}
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const ChipGroup = ({ 
  chips, 
  selectedId, 
  onSelect, 
  multiSelect = false,
  scrollable = true 
}) => {
  const [selectedItems, setSelectedItems] = useState(
    multiSelect ? [] : selectedId ? [selectedId] : []
  );

  const handleSelect = (id) => {
    if (multiSelect) {
      const newSelection = selectedItems.includes(id)
        ? selectedItems.filter(item => item !== id)
        : [...selectedItems, id];
      setSelectedItems(newSelection);
      if (onSelect) onSelect(newSelection);
    } else {
      setSelectedItems([id]);
      if (onSelect) onSelect(id);
    }
  };

  const content = (
    <View style={styles.chipGroup}>
      {chips.map((chip) => (
        <Chip
          key={chip.id}
          label={chip.label}
          icon={chip.icon}
          selected={selectedItems.includes(chip.id)}
          onPress={() => handleSelect(chip.id)}
          color={chip.color}
          style={styles.chipGroupItem}
        />
      ))}
    </View>
  );

  return scrollable ? (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipScrollContainer}
    >
      {content}
    </ScrollView>
  ) : content;
};

export const SearchBar = ({ 
  value, 
  onChangeText, 
  placeholder = 'Pesquisar...', 
  onFocus,
  onBlur,
  style 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      friction: 5,
      useNativeDriver: true
    }).start();
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true
    }).start();
    if (onBlur) onBlur();
  };

  return (
    <Animated.View 
      style={[
        styles.searchBar,
        isFocused && styles.searchBarFocused,
        { transform: [{ scale: scaleAnim }] },
        style
      ]}
    >
      <MaterialCommunityIcons 
        name="magnify" 
        size={20} 
        color={isFocused ? NUBANK_COLORS.PRIMARY : NUBANK_COLORS.TEXT_TERTIARY} 
      />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <MaterialCommunityIcons 
            name="close-circle" 
            size={18} 
            color={NUBANK_COLORS.TEXT_TERTIARY} 
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export const SegmentedControl = ({ segments, selectedIndex, onSelect, style }) => {
  const [indicatorPosition] = useState(new Animated.Value(0));
  const segmentWidth = 100 / segments.length;

  useEffect(() => {
    Animated.spring(indicatorPosition, {
      toValue: selectedIndex * segmentWidth,
      friction: 5,
      useNativeDriver: false
    }).start();
  }, [selectedIndex]);

  return (
    <View style={[styles.segmentedControl, style]}>
      <Animated.View
        style={[
          styles.segmentIndicator,
          {
            width: `${segmentWidth}%`,
            left: indicatorPosition.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%']
            })
          }
        ]}
      />
      {segments.map((segment, index) => (
        <TouchableOpacity
          key={index}
          style={styles.segment}
          onPress={() => onSelect(index)}
        >
          <Text
            style={[
              styles.segmentText,
              selectedIndex === index && styles.segmentTextSelected
            ]}
          >
            {segment}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const ProgressBar = ({ progress = 0, height = 8, color = NUBANK_COLORS.PRIMARY, style }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false
    }).start();
  }, [progress]);

  return (
    <View style={[styles.progressBar, { height }, style]}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%']
            })
          }
        ]}
      />
    </View>
  );
};

export const Badge = ({ count, color = NUBANK_COLORS.ERROR, style }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (count > 0) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [count]);

  if (count <= 0) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: color, transform: [{ scale: scaleAnim }] },
        style
      ]}
    >
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </Animated.View>
  );
};

export const LoadingOverlay = ({ visible = false, message = 'Carregando...' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NUBANK_COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

export const EmptyState = ({ 
  icon = 'inbox', 
  title = 'Nada aqui', 
  subtitle, 
  actionLabel,
  onAction,
  style 
}) => {
  return (
    <View style={[styles.emptyState, style]}>
      <MaterialCommunityIcons
        name={icon}
        size={64}
        color={NUBANK_COLORS.TEXT_TERTIARY}
      />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.MD,
    paddingVertical: NUBANK_SPACING.SM,
    borderRadius: NUBANK_BORDER_RADIUS.FULL,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.BORDER
  },
  chipSelected: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    borderColor: NUBANK_COLORS.PRIMARY
  },
  chipIcon: {
    fontSize: NUBANK_FONT_SIZES.MD,
    marginRight: NUBANK_SPACING.XS
  },
  chipLabel: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },
  chipLabelSelected: {
    color: NUBANK_COLORS.TEXT_WHITE
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  chipGroupItem: {
    marginRight: NUBANK_SPACING.SM,
    marginBottom: NUBANK_SPACING.SM
  },
  chipScrollContainer: {
    paddingVertical: NUBANK_SPACING.SM
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    paddingHorizontal: NUBANK_SPACING.MD,
    paddingVertical: NUBANK_SPACING.SM,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.BORDER
  },
  searchBarFocused: {
    borderColor: NUBANK_COLORS.PRIMARY,
    backgroundColor: NUBANK_COLORS.SURFACE
  },
  searchInput: {
    flex: 1,
    marginLeft: NUBANK_SPACING.SM,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.XS,
    position: 'relative'
  },
  segmentIndicator: {
    position: 'absolute',
    top: NUBANK_SPACING.XS,
    bottom: NUBANK_SPACING.XS,
    backgroundColor: NUBANK_COLORS.SURFACE,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    ...NUBANK_SHADOWS.SMALL
  },
  segment: {
    flex: 1,
    paddingVertical: NUBANK_SPACING.SM,
    alignItems: 'center',
    zIndex: 1
  },
  segmentText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },
  segmentTextSelected: {
    color: NUBANK_COLORS.TEXT_PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD
  },
  progressBar: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.FULL,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: NUBANK_BORDER_RADIUS.FULL
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.XS
  },
  badgeText: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontSize: NUBANK_FONT_SIZES.XS,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  loadingContainer: {
    backgroundColor: NUBANK_COLORS.SURFACE,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.XL,
    alignItems: 'center',
    ...NUBANK_SHADOWS.LARGE
  },
  loadingText: {
    marginTop: NUBANK_SPACING.MD,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: NUBANK_SPACING.XL
  },
  emptyTitle: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginTop: NUBANK_SPACING.MD
  },
  emptySubtitle: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginTop: NUBANK_SPACING.SM,
    textAlign: 'center'
  },
  emptyAction: {
    marginTop: NUBANK_SPACING.LG,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.MD,
    backgroundColor: NUBANK_COLORS.PRIMARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG
  },
  emptyActionText: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD
  }
});

export default {
  Chip,
  ChipGroup,
  SearchBar,
  SegmentedControl,
  ProgressBar,
  Badge,
  LoadingOverlay,
  EmptyState
};