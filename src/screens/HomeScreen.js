import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getCategories } from '../api/woocommerce';
import BannerCarousel from '../components/BannerCarousel';
import CategoryGrid from '../components/CategoryGrid';
import LoadingSpinner from '../components/LoadingSpinner';
import colors from '../constants/colors';
import theme from '../constants/theme';

const PAD = 16;

export default function HomeScreen() {
  const navigation = useNavigation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const resCategories = await getCategories();
      const categoryList = Array.isArray(resCategories.data) ? resCategories.data : [];
      if (resCategories.success) {
        setCategories(categoryList);
        setError(null);
      } else {
        setError(resCategories.error || 'Error al cargar');
        setCategories(categoryList);
      }
    } catch (e) {
      setError('Error al conectar con la tienda.');
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

  const handleCategorySelect = useCallback(
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

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <LoadingSpinner message="Cargando..." size="large" />
      </View>
    );
  }

  if (error && !categories.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        <TouchableOpacity onPress={handleVerTodos} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.verTodos}>Ver todos →</Text>
        </TouchableOpacity>
      </View>

      <CategoryGrid
        categories={categories}
        onSelect={handleCategorySelect}
        loading={loading && !refreshing}
      />

      {error && categories.length > 0 && (
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
});
