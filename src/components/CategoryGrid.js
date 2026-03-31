import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import CategoryGridCard from './CategoryGridCard';

/**
 * Map of WooCommerce category slug (or lowercased name) → Feather icon name.
 * Add entries as new categories appear in the catalog.
 */
const CATEGORY_ICONS = {
  // Parent categories (from WooCommerce store)
  'cuidado-de-la-piel': 'face-woman-outline',
  'maquillaje': 'brush',
  'fragancia': 'spray',
  'cuerpo-y-sol': 'lotion-outline',
  'herramientas-y-accesorios': 'toolbox-outline',
  'kit': 'package-variant',
  'sin-categorizar': 'dots-grid',
  // Common subcategory slugs
  'labios': 'lipstick',
  'ojos': 'eye-outline',
  'rostro': 'palette-outline',
  // Fallback is applied in the component (default prop iconName = 'dots-grid')
};

/**
 * Resolves the best Feather icon for a category by checking slug first,
 * then the lowercased name, then falling back to 'grid'.
 */
function resolveIcon(category) {
  const bySlug = CATEGORY_ICONS[category?.slug?.toLowerCase()];
  if (bySlug) return bySlug;
  const byName = CATEGORY_ICONS[category?.name?.toLowerCase()];
  if (byName) return byName;
  return 'dots-grid';
}

/**
 * CategoryGrid
 *
 * Renders parent categories in a 2-column wrap grid.
 * Gap between columns: 12pt. Screen edge padding: managed by parent.
 *
 * Props
 * ─────
 * @param {object[]} categories   WooCommerce category objects (parent === 0)
 * @param {function} onSelect     (category) => void
 * @param {boolean}  [loading]    Show 4-card skeleton grid
 */
export default function CategoryGrid({ categories = [], onSelect, loading = false }) {
  const parentCategories = useMemo(
    () => (loading ? [] : categories.filter((c) => c.parent === 0)),
    [categories, loading]
  );

  const skeletons = loading ? [1, 2, 3, 4] : [];

  return (
    <View style={styles.grid}>
      {loading
        ? skeletons.map((k) => (
            <CategoryGridCard
              key={`skel-${k}`}
              category={{ name: '' }}
              loading
            />
          ))
        : parentCategories.map((cat) => (
            <CategoryGridCard
              key={`cat-${cat.id}`}
              category={cat}
              iconName={resolveIcon(cat)}
              onPress={onSelect}
            />
          ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,                 // column + row gap in one declaration (RN 0.71+)
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
