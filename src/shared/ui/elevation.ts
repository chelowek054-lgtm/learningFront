// Тень блока по токену elevation.card (D-0001 1.9.0): второй слой — основная мягкая тень.
// React Native держит одну тень на view, поэтому берём крупный слой; цвет — роль shadow темы.
import type { ViewStyle } from 'react-native';

export function elevationCard(color: string, alpha = 0.06): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: alpha,
    shadowRadius: 14,
    elevation: 2,
  };
}
