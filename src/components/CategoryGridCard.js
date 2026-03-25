import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;   // screen edge padding
const GRID_GAP = 12;        // gap between the two columns
const CARD_WIDTH =
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

/**
 * CategoryGridCard
 *
 * Single card in the 2-column category grid on HomeScreen.
 *
 * Props
 * ─────
 * @param {object}   category        WooCommerce category object
 * @param {string}   category.name   Category display name
 * @param {string}   [iconName]      Feather icon name (default: 'grid')
 * @param {function} onPress         (category) => void
 * @param {boolean}  [loading]       Show skeleton state
 */
export default function CategoryGridCard({
  category,
  iconName = 'grid',
  onPress,
  loading = false,
}) {
  if (loading) {
    return <View style={[styles.card, styles.skeleton]} />;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(category)}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`Categoría ${category?.name ?? ''}`}
    >
      {/* Icon container — light pink circle on white card */}
      <View style={styles.iconCircle}>
        <Feather name={iconName} size={26} color={colors.primary} />
      </View>

      {/* Category name */}
      <Text style={styles.label} numberOfLines={2} textBreakStrategy="balanced">
        {category?.name ?? ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    // Enough vertical space for circle + text without feeling cramped
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: colors.white,        // #FFFFFF — clean premium base
    borderRadius: theme.borderRadius.card, // 12
    alignItems: 'center',
    // Subtle border provides structure without competing with shadow
    borderWidth: 1,
    borderColor: '#F0E4E9',               // warm pink-tinted hairline
    // Shadow from design tokens — consistent with ProductCard
    ...theme.shadow,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,                     // perfect circle
    backgroundColor: colors.lightGray,    // #FDF1F5 — soft pink tint
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkGray,               // #333333
    textAlign: 'center',
    lineHeight: 18,
  },
  skeleton: {
    height: 120,
    backgroundColor: colors.lightGray,
  },
});
