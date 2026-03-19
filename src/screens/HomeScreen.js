import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getProducts, getCategories } from '../api/woocommerce';
import BannerCarousel from '../components/BannerCarousel';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { PREMIO_PRODUCT_ID } from '../constants/cartRules';
import colors from '../constants/colors';
import theme from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD = 16;
const CARD_WIDTH = (SCREEN_WIDTH - PAD * 2 - 12) / 2;

export default function HomeScreen() {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const resProducts = await getProducts(1, 20);
      const resCategories = await getCategories();
      const rawProducts = Array.isArray(resProducts.data) ? resProducts.data : [];
      const productList = rawProducts.filter((p) => p && p.id !== PREMIO_PRODUCT_ID);
      const categoryList = Array.isArray(resCategories.data) ? resCategories.data : [];
      if (resProducts.success && resCategories.success) {
        setProducts(productList);
        setCategories(categoryList);
        setError(null);
      } else {
        const msg = resProducts.error || resCategories.error || 'Error al cargar';
        setError(msg);
        if (resProducts.success) setProducts(productList);
        if (resCategories.success) setCategories(categoryList);
      }
    } catch (e) {
      setError('Error al conectar con la tienda.');
      setProducts([]);
      setCategories([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectCategory = useCallback(
    (category) => {
      navigation.navigate('Tienda', {
        screen: 'Store',
        params: { categoryId: category.id },
      });
    },
    [navigation]
  );

  const handleVerTodos = useCallback(() => {
    navigation.navigate('Tienda');
  }, [navigation]);

  const handleProductPress = useCallback(
    (product) => {
      navigation.navigate('ProductDetail', { product });
    },
    [navigation]
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <LoadingSpinner message="Cargando..." size="large" />
      </View>
    );
  }

  if (error && !products.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const featuredProducts = (products || []).slice(0, 6);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.welcomeBar}>
        <Text style={styles.welcomeText}>Bienvenida a Mary Kay</Text>
      </View>
      <BannerCarousel />

      <Text style={styles.sectionTitle}>Categorías</Text>
      <CategoryList categories={categories} onSelectCategory={handleSelectCategory} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Productos Destacados</Text>
        <TouchableOpacity onPress={handleVerTodos} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.verTodos}>Ver todos →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {featuredProducts.map((product, index) =>
          product && product.id ? (
            <View key={`product-${product.id}-${index}`} style={styles.gridItem}>
              <ProductCard product={product} onPress={handleProductPress} />
            </View>
          ) : null
        )}
      </View>
      {featuredProducts.length === 0 && !loading && (
        <Text style={styles.emptyText}>No hay productos destacados</Text>
      )}

      {error && products.length > 0 && (
        <Text style={styles.inlineError}>{error}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  welcomeBar: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: PAD,
    marginBottom: 8,
  },
  welcomeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 12,
    paddingHorizontal: PAD,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PAD,
    marginBottom: 12,
  },
  verTodos: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PAD,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: CARD_WIDTH,
    marginBottom: 4,
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
  inlineError: {
    fontSize: 13,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: PAD,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: PAD,
  },
});
