import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import colors from '../constants/colors';
import theme from '../constants/theme';

export default function CategoryList({ categories = [], onSelectCategory }) {
  if (!categories.length) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((cat, index) => (
          <TouchableOpacity
            key={`cat-${cat.id}-${index}`}
            style={styles.chip}
            onPress={() => onSelectCategory && onSelectCategory(cat)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText} numberOfLines={1}>
              {cat.name || cat.slug || 'Categoría'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  chip: {
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: theme.borderRadius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  chipText: {
    color: colors.darkGray,
    fontSize: 14,
    maxWidth: 140,
  },
});
