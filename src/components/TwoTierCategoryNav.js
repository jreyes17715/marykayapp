import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

// Row height including paddingTop (8) + chip height (~44) + paddingBottom (12) = ~64
const SUBCATEGORY_ROW_HEIGHT = 64;
const ANIMATION_DURATION = 180;

export default function TwoTierCategoryNav({
  categories = [],
  selectedParentId,
  selectedSubId,
  onSelectParent,
  onSelectSub,
}) {
  // Derive parent list and child map from flat category array.
  // parent === 0 means top-level in WooCommerce.
  const { parents, childrenByParent } = useMemo(() => {
    const childrenByParent = {};
    const parents = [];

    for (const cat of categories) {
      if (cat.parent === 0) {
        parents.push(cat);
      } else {
        if (!childrenByParent[cat.parent]) {
          childrenByParent[cat.parent] = [];
        }
        childrenByParent[cat.parent].push(cat);
      }
    }

    return { parents, childrenByParent };
  }, [categories]);

  const activeChildren =
    selectedParentId != null ? (childrenByParent[selectedParentId] ?? []) : [];

  const hasChildren = activeChildren.length > 0;

  // Animated height for the subcategory row
  const rowHeight = useRef(new Animated.Value(0)).current;
  const rowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasChildren) {
      Animated.parallel([
        Animated.timing(rowHeight, {
          toValue: SUBCATEGORY_ROW_HEIGHT,
          duration: ANIMATION_DURATION,
          useNativeDriver: false,
        }),
        Animated.timing(rowOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(rowHeight, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: false,
        }),
        Animated.timing(rowOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [hasChildren]);

  const renderParentChip = ({ item }) => {
    const isAll = item.id === 'all';
    const isSelected = isAll
      ? selectedParentId === null
      : selectedParentId === item.id;
    const childCount = isAll ? 0 : (childrenByParent[item.id]?.length ?? 0);
    const hasChildrenForThisItem = childCount > 0;

    return (
      <TouchableOpacity
        style={[styles.parentChip, isSelected && styles.parentChipSelected]}
        onPress={() => onSelectParent(isAll ? null : item.id)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={
          isAll
            ? 'Ver todos los productos'
            : `Categoría ${item.name}${hasChildrenForThisItem ? `, ${childCount} subcategorías` : ''}`
        }
        accessibilityState={{ selected: isSelected }}
      >
        {!isAll && (
          <Feather
            name="grid"
            size={14}
            color={isSelected ? colors.white : colors.darkGray}
            style={styles.parentIcon}
          />
        )}
        <Text
          style={[styles.parentChipText, isSelected && styles.parentChipTextSelected]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {hasChildrenForThisItem && (
          <Feather
            name="chevron-down"
            size={12}
            color={isSelected ? colors.white : colors.gray}
            style={styles.chevron}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderSubChip = ({ item }) => {
    const isSelected = selectedSubId === item.id;

    return (
      <TouchableOpacity
        style={[styles.subChip, isSelected && styles.subChipSelected]}
        onPress={() => onSelectSub(item.id)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Subcategoría ${item.name}`}
        accessibilityState={{ selected: isSelected }}
      >
        <Feather
          name="tag"
          size={13}
          color={isSelected ? colors.primary : colors.darkGray}
          style={styles.subIcon}
        />
        <Text
          style={[styles.subChipText, isSelected && styles.subChipTextSelected]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const parentData = [{ id: 'all', name: 'Todos', parent: 0 }, ...parents];

  return (
    <View style={styles.container}>
      {/* Row 1: Parent categories */}
      <FlatList
        data={parentData}
        horizontal
        keyExtractor={(item) => `parent-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.parentScrollContent}
        renderItem={renderParentChip}
      />

      {/* Row 2: Subcategories (animated in/out) */}
      <Animated.View
        style={[
          styles.subRowContainer,
          { height: rowHeight, opacity: rowOpacity },
        ]}
      >
        <FlatList
          data={activeChildren}
          horizontal
          keyExtractor={(item) => `sub-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subScrollContent}
          renderItem={renderSubChip}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No horizontal padding here - parent sets paddingHorizontal
  },

  // ── Parent row ──────────────────────────────────────────
  parentScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  parentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    backgroundColor: colors.lightGray,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.pill,
    marginRight: 8,
  },
  parentChipSelected: {
    backgroundColor: colors.primary,
  },
  parentChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkGray,
    maxWidth: 120,
  },
  parentChipTextSelected: {
    color: colors.white,
  },
  chevron: {
    marginLeft: 4,
  },
  parentIcon: {
    marginRight: 6,
  },
  subIcon: {
    marginRight: 6,
  },

  // ── Subcategory row ──────────────────────────────────────
  subRowContainer: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#F0E4E9',
  },
  subScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1.5,
    borderColor: '#E8D4DC',
    marginRight: 8,
  },
  subChipSelected: {
    backgroundColor: 'rgba(209, 30, 81, 0.10)',
    borderColor: colors.primary,
  },
  subChipText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.darkGray,
    maxWidth: 120,
  },
  subChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
