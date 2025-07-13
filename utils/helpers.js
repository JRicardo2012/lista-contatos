// utils/helpers.js
import { Dimensions, PixelRatio } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

export const rs = {
  scale: (size) =>
    Math.round(PixelRatio.roundToNearestPixel((screenWidth / 375) * size)),
  spacing: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  fontSize: {
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
  },
  buttonHeight: 50,
};

export function formatPhone(value) {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}