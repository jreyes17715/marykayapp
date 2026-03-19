import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  getProducts,
  getProductsByCategory,
  getCategories,
  searchProducts,
} from '../api/woocommerce';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { PREMIO_PRODUCT_ID } from '../constants/cartRules';
import colors from '../constants/colors';
import theme from '../constants/theme';
import { Feather } from '@expo/vector-icons';

function filterPremio(list) {
  return Array.isArray(list) ? list.filter((p) => p && p.id !== PREMIO_PRODUCT_ID) : [];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD = 16;
const GAP = 8;
const PER_PAGE = 20;
const DEBOUNCE_MS = 500;
const ITEM_WIDTH = (SCREEN_WIDTH - PAD * 2 - GAP) / 2;

export default function StoreScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const initialCategoryId = route.params?.categoryId ?? null;
  const initialCategoryName = route.params?.categoryName ?? null;

  const loadCategories = useCallback(async () => {
    const res = await getCategories();
    if (res.success && res.data) {
      setCategories(Array.isArray(res.data) ? res.data : []);
    }
  }, []);

  const fetchProducts = useCallback(
    async (pageNum = 1, append = false, overrideCategoryId = undefined) => {
      const categoryId = overrideCategoryId !== undefined ? overrideCategoryId : selectedCategoryId;
      const query = searchQuery.trim();

      if (query) {
        const res = await searchProducts(query);
        if (res.success) {
          const list = filterPremio(res.data);
          setProducts(list);
          setHasMore(false);
        } else {
          if (!append) setProducts([]);
          setError(res.error);
        }
        return;
      }

      if (categoryId) {
        const res = await getProductsByCategory(categoryId, pageNum, PER_PAGE);
        if (res.success) {
          const raw = Array.isArray(res.data) ? res.data : [];
          const list = filterPremio(raw);
          setHasMore(raw.length >= PER_PAGE);
          if (append) {
            setProducts((prev) => [...prev, ...list]);
          } else {
            setProducts(list);
          }
          setError(null);
        } else {
          if (!append) setProducts([]);
          setError(res.error);
          setHasMore(false);
        }
        return;
      }

      const res = await getProducts(pageNum, PER_PAGE);
      if (res.success) {
        const raw = Array.isArray(res.data) ? res.data : [];
        const list = filterPremio(raw);
        setHasMore(raw.length >= PER_PAGE);
        if (append) {
          setProducts((prev) => [...prev, ...list]);
        } else {
          setProducts(list);
        }
        setError(null);
      } else {
        if (!append) setProducts([]);
        setError(res.error);
        setHasMore(false);
      }
    },
    [searchQuery, selectedCategoryId]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    await loadCategories();
    if (initialCategoryId != null) {
      setSelectedCategoryId(initialCategoryId);
      await fetchProducts(1, false, initialCategoryId);
    } else {
      await fetchProducts(1, false);
    }
    setPage(1);
    setLoading(false);
  }, [initialCategoryId, loadCategories, fetchProducts]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setLoading(true);
    setError(null);
    fetchProducts(1, false).then(() => setLoading(false));
    setPage(1);
  }, [searchQuery, selectedCategoryId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedCategoryId == null) {
      navigation.setOptions({ headerTitle: 'Mary Kay' });
      return;
    }
    const cat = categories.find((c) => c.id === selectedCategoryId);
    const title = cat?.name || initialCategoryName || 'Mary Kay';
    navigation.setOptions({ headerTitle: title });
  }, [selectedCategoryId, categories, initialCategoryName, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    setError(null);
    Promise.all([
      loadCategories(),
      fetchProducts(1, false),
    ]).then(() => {
      setRefreshing(false);
      setPage(1);
    });
  }, [loadCategories, fetchProducts]);

  const onEndReached = useCallback(() => {
    if (loadingMore || !hasMore || searchQuery.trim()) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    fetchProducts(nextPage, true).then(() => {
      setPage(nextPage);
      setLoadingMore(false);
    });
  }, [page, hasMore, searchQuery, loadingMore, fetchProducts]);

  const handleSelectCategory = useCallback((categoryId) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
    setHasMore(true);
  }, []);

  const handleProductPress = useCallback(
    (product) => {
      navigation.navigate('ProductDetail', { product });
    },
    [navigation]
  );

  const renderHeader = useCallback(() => {
    return (
      <View style={styles.headerContent}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            placeholderTextColor={colors.gray}
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
        <FlatList
          data={[{ id: 'all', name: 'Todos' }, ...categories]}
          horizontal
          keyExtractor={(item, index) => (item.id === 'all' ? 'all' : `cat-${item.id}-${index}`)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
          renderItem={({ item }) => {
            const isAll = item.id === 'all';
            const isSelected = isAll
              ? selectedCategoryId === null
              : selectedCategoryId === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
                onPress={() =>
                  handleSelectCategory(isAll ? null : item.id)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {item.name || 'Todos'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  }, [
    searchInput,
    categories,
    selectedCategoryId,
    handleSelectCategory,
  ]);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.itemWrapper}>
        <ProductCard product={item} onPress={handleProductPress} />
      </View>
    ),
    [handleProductPress]
  );

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <LoadingSpinner message="Cargando..." size="small" />
        </View>
      );
    }
    if (!hasMore && products.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>No hay más productos</Text>
        </View>
      );
    }
    return null;
  }, [loadingMore, hasMore, products.length]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.emptyState}>
          <Feather name="alert-triangle" size={40} color={colors.primary} style={styles.emptyIcon} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadInitial()}
          >
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Feather name="package" size={40} color={colors.gray} style={styles.emptyIcon} />
        <Text style={styles.emptyText}>No se encontraron productos</Text>
      </View>
    );
  }, [loading, error, loadInitial]);

  const keyExtractor = useCallback((item, index) => `${item.id}-${index}`, []);

  if (loading && products.length === 0 && !refreshing) {
    return (
      <View style={styles.center}>
        <LoadingSpinner message="Cargando..." size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        key="grid"
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          products.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    paddingHorizontal: PAD,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: theme.borderRadius.input,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.darkGray,
  },
  categoriesScroll: {
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: colors.lightGray,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.pill,
    marginRight: 10,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.darkGray,
    fontWeight: '500',
    maxWidth: 120,
  },
  chipTextSelected: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: PAD,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: GAP,
  },
  itemWrapper: {
    width: ITEM_WIDTH,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.gray,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.darkGray,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.button,
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
