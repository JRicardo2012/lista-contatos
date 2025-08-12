import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform
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

export const AnimatedInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  error,
  success,
  icon,
  onFocus,
  onBlur,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const labelPosition = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderColor = useRef(new Animated.Value(0)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(labelPosition, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false
    }).start();
  }, [isFocused, value]);

  useEffect(() => {
    if (error) {
      // Shake animation on error
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
      ]).start();
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [error]);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderColor, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false
    }).start();
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderColor, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false
    }).start();
    if (onBlur) onBlur();
  };

  const animatedBorderColor = borderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? NUBANK_COLORS.ERROR : NUBANK_COLORS.BORDER,
      success ? NUBANK_COLORS.SUCCESS : NUBANK_COLORS.PRIMARY
    ]
  });

  const labelTop = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -8]
  });

  const labelSize = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [NUBANK_FONT_SIZES.MD, NUBANK_FONT_SIZES.XS]
  });

  return (
    <Animated.View 
      style={[
        styles.inputContainer, 
        { transform: [{ translateX: shakeAnimation }] },
        style
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={isFocused ? NUBANK_COLORS.PRIMARY : NUBANK_COLORS.TEXT_TERTIARY}
          style={styles.inputIcon}
        />
      )}
      
      <View style={styles.inputWrapper}>
        <Animated.Text
          style={[
            styles.inputLabel,
            {
              top: labelTop,
              fontSize: labelSize,
              color: error 
                ? NUBANK_COLORS.ERROR 
                : success 
                  ? NUBANK_COLORS.SUCCESS 
                  : isFocused 
                    ? NUBANK_COLORS.PRIMARY 
                    : NUBANK_COLORS.TEXT_SECONDARY
            }
          ]}
        >
          {label}
        </Animated.Text>
        
        <Animated.View
          style={[
            styles.inputField,
            { borderColor: animatedBorderColor }
          ]}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={isFocused ? placeholder : ''}
            placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            style={styles.textInput}
            {...props}
          />
        </Animated.View>
        
        {error && (
          <Text style={styles.errorText}>
            <MaterialCommunityIcons name="alert-circle" size={12} /> {error}
          </Text>
        )}
        
        {success && !error && (
          <Text style={styles.successText}>
            <MaterialCommunityIcons name="check-circle" size={12} /> {success}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

export const CurrencyInput = ({ 
  value, 
  onChangeText, 
  label = 'Valor',
  error,
  style 
}) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value) {
      const numericValue = parseFloat(value.toString().replace(/[^0-9]/g, '')) / 100;
      setDisplayValue(formatCurrency(numericValue));
    }
  }, [value]);

  const handleChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    
    if (numericValue === '') {
      setDisplayValue('');
      onChangeText('0');
    } else {
      setDisplayValue(formatCurrency(floatValue));
      onChangeText(floatValue.toString());
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <AnimatedInput
      label={label}
      value={displayValue}
      onChangeText={handleChange}
      placeholder="R$ 0,00"
      keyboardType="numeric"
      error={error}
      icon="currency-brl"
      style={style}
    />
  );
};

export const DatePickerInput = ({ 
  value, 
  onChange, 
  label = 'Data',
  minimumDate,
  maximumDate,
  style 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const togglePicker = () => {
    setShowPicker(!showPicker);
    Animated.timing(fadeAnim, {
      toValue: showPicker ? 0 : 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <View style={[styles.datePickerContainer, style]}>
      <TouchableOpacity onPress={togglePicker}>
        <AnimatedInput
          label={label}
          value={formatDate(value)}
          editable={false}
          icon="calendar"
          pointerEvents="none"
        />
      </TouchableOpacity>
      
      {showPicker && Platform.OS === 'ios' && (
        <Animated.View 
          style={[
            styles.pickerContainer,
            { opacity: fadeAnim }
          ]}
        >
          {/* DateTimePicker aqui */}
        </Animated.View>
      )}
    </View>
  );
};

export const SelectInput = ({ 
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecione...',
  icon,
  error,
  style 
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const dropdownHeight = useRef(new Animated.Value(0)).current;

  const toggleDropdown = () => {
    const toValue = showOptions ? 0 : options.length * 50;
    setShowOptions(!showOptions);
    
    Animated.spring(dropdownHeight, {
      toValue,
      friction: 8,
      useNativeDriver: false
    }).start();
  };

  const handleSelect = (option) => {
    onChange(option);
    toggleDropdown();
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={[styles.selectContainer, style]}>
      <TouchableOpacity onPress={toggleDropdown}>
        <AnimatedInput
          label={label}
          value={selectedOption?.label || ''}
          placeholder={placeholder}
          editable={false}
          icon={icon}
          error={error}
          pointerEvents="none"
        />
        <MaterialCommunityIcons
          name={showOptions ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={NUBANK_COLORS.TEXT_SECONDARY}
          style={styles.dropdownIcon}
        />
      </TouchableOpacity>
      
      <Animated.View 
        style={[
          styles.dropdownContainer,
          { height: dropdownHeight }
        ]}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.dropdownOption,
              value === option.value && styles.dropdownOptionSelected
            ]}
            onPress={() => handleSelect(option.value)}
          >
            {option.icon && (
              <Text style={styles.optionIcon}>{option.icon}</Text>
            )}
            <Text style={[
              styles.optionText,
              value === option.value && styles.optionTextSelected
            ]}>
              {option.label}
            </Text>
            {value === option.value && (
              <MaterialCommunityIcons
                name="check"
                size={20}
                color={NUBANK_COLORS.PRIMARY}
                style={styles.checkIcon}
              />
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
};

export const Switch = ({ 
  value, 
  onValueChange, 
  label,
  disabled,
  style 
}) => {
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;
  const backgroundColor = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: value ? 20 : 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(backgroundColor, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false
      })
    ]).start();
  }, [value]);

  const handleToggle = () => {
    if (!disabled) {
      onValueChange(!value);
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const animatedBackgroundColor = backgroundColor.interpolate({
    inputRange: [0, 1],
    outputRange: [NUBANK_COLORS.BORDER, NUBANK_COLORS.PRIMARY]
  });

  return (
    <TouchableOpacity 
      style={[styles.switchContainer, style]} 
      onPress={handleToggle}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {label && (
        <Text style={styles.switchLabel}>{label}</Text>
      )}
      <Animated.View 
        style={[
          styles.switchTrack,
          { backgroundColor: animatedBackgroundColor },
          disabled && styles.switchDisabled
        ]}
      >
        <Animated.View 
          style={[
            styles.switchThumb,
            { transform: [{ translateX }] }
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: NUBANK_SPACING.LG
  },
  inputWrapper: {
    position: 'relative'
  },
  inputLabel: {
    position: 'absolute',
    left: NUBANK_SPACING.MD,
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    paddingHorizontal: NUBANK_SPACING.XS,
    zIndex: 1
  },
  inputField: {
    borderWidth: 1.5,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    backgroundColor: NUBANK_COLORS.SURFACE
  },
  textInput: {
    paddingHorizontal: NUBANK_SPACING.MD,
    paddingVertical: NUBANK_SPACING.MD,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  inputIcon: {
    position: 'absolute',
    left: NUBANK_SPACING.MD,
    top: 18,
    zIndex: 1
  },
  errorText: {
    color: NUBANK_COLORS.ERROR,
    fontSize: NUBANK_FONT_SIZES.XS,
    marginTop: NUBANK_SPACING.XS,
    marginLeft: NUBANK_SPACING.MD
  },
  successText: {
    color: NUBANK_COLORS.SUCCESS,
    fontSize: NUBANK_FONT_SIZES.XS,
    marginTop: NUBANK_SPACING.XS,
    marginLeft: NUBANK_SPACING.MD
  },
  datePickerContainer: {
    position: 'relative'
  },
  pickerContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: NUBANK_COLORS.SURFACE,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    ...NUBANK_SHADOWS.MEDIUM
  },
  selectContainer: {
    position: 'relative'
  },
  dropdownIcon: {
    position: 'absolute',
    right: NUBANK_SPACING.MD,
    top: 18
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: NUBANK_COLORS.SURFACE,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    marginTop: NUBANK_SPACING.XS,
    overflow: 'hidden',
    ...NUBANK_SHADOWS.MEDIUM,
    zIndex: 1000
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.MD,
    paddingVertical: NUBANK_SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.BORDER
  },
  dropdownOptionSelected: {
    backgroundColor: NUBANK_COLORS.PRIMARY_LIGHT
  },
  optionIcon: {
    fontSize: NUBANK_FONT_SIZES.LG,
    marginRight: NUBANK_SPACING.SM
  },
  optionText: {
    flex: 1,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  optionTextSelected: {
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.PRIMARY
  },
  checkIcon: {
    marginLeft: NUBANK_SPACING.SM
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: NUBANK_SPACING.MD
  },
  switchLabel: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    flex: 1
  },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 3
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: NUBANK_COLORS.TEXT_WHITE,
    ...NUBANK_SHADOWS.SMALL
  },
  switchDisabled: {
    opacity: 0.5
  }
});

export default {
  AnimatedInput,
  CurrencyInput,
  DatePickerInput,
  SelectInput,
  Switch
};