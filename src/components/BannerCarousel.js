import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { getProducts, getProductImage } from '../api/woocommerce';
import colors from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;
const AUTO_SCROLL_INTERVAL = 4000;

const FALLBACK_BANNERS = [
  { id: 'f1', bg: '#d11e51', title: 'Nuevos Productos', image: null, productId: null },
  { id: 'f2', bg: '#000000', title: 'Ofertas Especiales', image: null, productId: null },
  { id: 'f3', bg: '#d11e51', title: 'Consultoría Personalizada', image: null, productId: null },
];

function BannerSlide({ item, onPress }) {
  if (item.image) {
    return (
      <TouchableOpacity
        style={styles.slide}
        onPress={onPress}
        activeOpacity={0.9}
        disabled={!item.productId}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.slideImage}
          contentFit="cover"
          placeholder={null}
          transition={200}
          cachePolicy="memory-disk"
        />
        <View style={styles.slideOverlay}>
          <Text style={styles.slideText} numberOfLines={2}>{item.title}</Text>
        </View>
      </TouchableOpacity>
    );
  }
  return (
    <View style={[styles.slide, { backgroundColor: item.bg || colors.primary }]}>
      <Text style={styles.slideText}>{item.title}</Text>
    </View>
  );
}

export default function BannerCarousel() {
  const navigation = useNavigation();
  const [banners, setBanners] = useState(FALLBACK_BANNERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getProducts(1, 5).then((res) => {
      if (cancelled) return;
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const dynamicBanners = res.data
          .filter((p) => p.featured || (p.images && p.images.length > 0))
          .slice(0, 5)
          .map((p) => ({
            id: String(p.id),
            title: p.name ? p.name.replace(/<[^>]*>/g, '') : 'Producto',
            image: getProductImage(p),
            bg: colors.primary,
            productId: p.id,
          }));
        if (dynamicBanners.length > 0) {
          setBanners(dynamicBanners);
        }
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1 >= banners.length ? 0 : prev + 1;
        flatRef.current?.scrollToOffset({ offset: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
    return () => clearInterval(timer);
  }, [banners.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleBannerPress = (item) => {
    if (item.productId) {
      navigation.navigate('Tienda', {
        screen: 'ProductDetail',
        params: { productId: item.productId },
      });
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={banners}
        renderItem={({ item }) => (
          <BannerSlide item={item} onPress={() => handleBannerPress(item)} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
      <View style={styles.dots}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BANNER_HEIGHT,
    marginBottom: 16,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    position: 'absolute',
  },
  slideOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  slideText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
