# Baselines de Performance — Optimizador
> Metricas base del proyecto. Comparar contra estas despues de cada feature.
> Ultima medicion: 2026-03-31

## Codebase Size
- Archivos JS en src/: 43
- Lineas totales: 9,380
- Pantallas: 11
- Componentes: 13
- Utils: 5
- API clients: 2
- Constantes: 5
- Contextos: 2
- Navegacion: 1

## Desglose de Pantallas
- CartScreen, CheckoutScreen, ConsultantListScreen, HomeScreen, LoginScreen
- NotificationsScreen, OrderTrackingScreen, OrdersScreen, ProductDetailScreen
- ProfileScreen, StoreScreen

## Desglose de Componentes
- BannerCarousel, CartBadge, CategoryGrid, CategoryGridCard, CategoryList
- DropdownSelector, ErrorBoundary, FreeShippingBanner, LoadingSpinner
- OrderSummaryCard, ProductCard, QuantitySelector, TwoTierCategoryNav

## Desglose de Utils
- cartValidation.js, consultantState.js, discounts.js, helpers.js, shipping.js

## Desglose de Constantes
- cartRules.js, colors.js, config.js, provinces.js, theme.js

## Dependencias
- Produccion: 15 paquetes
  - @react-native-async-storage/async-storage 2.2.0
  - @react-navigation/bottom-tabs ^7.15.5
  - @react-navigation/native ^7.1.33
  - @react-navigation/native-stack ^7.14.4
  - axios ^1.13.6
  - dotenv ^17.3.1
  - expo ~54.0.33
  - expo-image ~3.0.11
  - expo-status-bar ~3.0.9
  - react 19.1.0
  - react-native 0.81.5
  - react-native-gesture-handler ~2.28.0
  - react-native-reanimated ~4.1.1
  - react-native-safe-area-context ~5.6.0
  - react-native-screens ~4.16.0
  - react-native-swiper-flatlist ^3.2.5
- Desarrollo: 5 paquetes
  - @testing-library/jest-native ^5.4.3
  - @testing-library/react-native ^13.3.3
  - jest ^29.7.0
  - jest-expo ^54.0.17
  - sharp ^0.34.5
- Paquetes instalados en node_modules (top-level): 505
- Tamano node_modules/: ~268 MB

## Tests
- Archivos de test: 3
  - __tests__/cartRules.test.js (25 tests)
  - __tests__/cartValidation.test.js (48 tests)
  - __tests__/discounts.test.js (28 tests)
- Tests totales: 147 (todos pasan — actualizado 2026-03-31)

## Arquitectura
- Contextos: AuthContext.js, CartContext.js
- API clients: woocommerce.js (WooCommerce REST API v3 + JWT), flai.js (bypassed)
- Navegacion: AppNavigator.js — Bottom tabs (4: Inicio, Tienda, Carrito, Perfil) + stacks anidados
- Estado global: React Context (sin Redux/Zustand)
- Persistencia local: AsyncStorage (@marykay_jwt_token, @marykay_cart)
- Autenticacion: WordPress JWT

## Bundle Size
- Pendiente — requiere `expo export` o `react-native bundle`
- Comando de referencia:
  npx react-native bundle --entry-file index.js --bundle-output output.js \
    --platform ios --sourcemap-output output.js.map --dev false --minify true
  npx source-map-explorer output.js --no-border-checks

## Observaciones de Performance (Primera Auditoria)
- No hay FlatList optimizada con getItemLayout en ProductCard (StoreScreen usa FlatList basica)
- BannerCarousel y CategoryGrid usan imagenes estaticas hardcodeadas (buen punto para cache)
- No hay React.memo ni useCallback en componentes de lista (ProductCard, CategoryGridCard)
- CartContext hace re-renders globales en cada cambio de carrito
- No hay paginacion en StoreScreen — carga todos los productos de WooCommerce en una sola llamada
- axios sin interceptores de retry ni cache — cada navegacion refetch completo
- FLAI bypassed: no hay overhead de red adicional por ese lado
- expo-image ya incluido (mejor que Image de RN para cache de imagenes)
- react-native-reanimated 4.x disponible pero posiblemente subutilizado

## Deuda Tecnica Detectada
- Notificaciones y banners hardcodeados (no dinamicos)
- Envio no calculado ("Por calcular")
- Evaluacion trimestral solo en login (no hay cron ni background task)
