# Arquitectura del Sistema

## Vision General

Aroma del Rosal es una aplicacion movil de e-commerce construida con React Native (Expo) para consultoras Mary Kay en Republica Dominicana. La app se conecta a un backend WordPress/WooCommerce existente y a un sistema externo de inventario (FLAI).

```
┌─────────────────────────────────────────────────┐
│                   APP MOVIL                      │
│              (React Native / Expo)               │
│                                                  │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ AuthContext│  │CartContext │  │  Navigation │  │
│  │  (JWT)    │  │(AsyncStore)│  │ (React Nav) │  │
│  └─────┬─────┘  └─────┬─────┘  └─────────────┘  │
│        │              │                          │
│  ┌─────┴──────────────┴──────────────────────┐   │
│  │              API Layer (axios)             │   │
│  │   woocommerce.js         flai.js          │   │
│  └─────┬───────────────────────┬─────────────┘   │
└────────┼───────────────────────┼─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   WordPress /   │    │   FLAI Server   │
│   WooCommerce   │    │  (Inventario)   │
│                 │    │                 │
│ - Productos     │    │ - Stock check   │
│ - Ordenes       │    │ - Reservaciones │
│ - Clientes      │    │                 │
│ - JWT Auth      │    │ (BYPASSED)      │
│ - Categorias    │    │                 │
└─────────────────┘    └─────────────────┘
```

## Capas de la Aplicacion

### 1. Capa de Presentacion (Screens + Components)
- **Screens** (`src/screens/`): Pantallas completas vinculadas a rutas de navegacion
- **Components** (`src/components/`): Componentes reutilizables (ProductCard, QuantitySelector, etc.)
- Estilos inline con `StyleSheet.create()`

### 2. Capa de Estado (Context)
- **AuthContext**: Sesion de usuario, JWT, datos del cliente WooCommerce
- **CartContext**: Carrito de compras, calculos de descuento, persistencia en AsyncStorage

### 3. Capa de Datos (API)
- **woocommerce.js**: Cliente REST para WooCommerce y WordPress JWT
- **flai.js**: Cliente para sistema de inventario FLAI (actualmente bypassed)

### 4. Capa de Utilidades (Utils + Constants)
- **discounts.js**: Logica de descuentos por nivel y producto
- **cartValidation.js**: Validacion de minimos de carrito
- **helpers.js**: Formateo de precios, extraccion de meta_data
- **constants/**: Colores, tema, configuracion, provincias

## Flujo de Datos

```
Usuario → Screen → Context (dispatch) → API call → WooCommerce
                                                        │
                                     ← Response ────────┘
                                     │
                        Context (update state)
                                     │
                        Screen (re-render)
```

## Estructura de Navegacion

```
AppNavigator
├── [No autenticado]
│   ├── Login
│   ├── Register
│   └── ConsultantList
│
└── [Autenticado] MainTabs
    ├── Tab: Inicio (HomeStack)
    │   ├── Home
    │   ├── ProductDetail
    │   └── Notifications
    ├── Tab: Tienda (StoreStack)
    │   ├── Store
    │   └── ProductDetail
    ├── Tab: Carrito (CartStack)
    │   ├── Cart
    │   └── Checkout
    └── Tab: Perfil (ProfileStack)
        ├── Profile
        ├── Orders
        └── OrderTracking
```

## Dependencias Clave

| Dependencia | Version | Proposito |
|---|---|---|
| expo | ~54.0.33 | Framework React Native |
| react-native | 0.81.5 | Runtime movil |
| react | 19.1.0 | UI library |
| @react-navigation/* | 7.x | Navegacion |
| axios | 1.13.6 | HTTP client |
| @react-native-async-storage | 2.2.0 | Persistencia local |
| react-native-reanimated | 4.1.1 | Animaciones |
| expo-image | 3.0.11 | Carga de imagenes |
| react-native-swiper-flatlist | 3.2.5 | Carrusel de banners |
