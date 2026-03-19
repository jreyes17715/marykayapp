# Estructura de Navegacion

**Archivo:** `src/navigation/AppNavigator.js`
**Libreria:** React Navigation 7.x (native-stack + bottom-tabs)

## Arbol de Navegacion

```
AppNavigator (NativeStackNavigator)
│
├── [Pantallas publicas - sin autenticacion]
│   ├── "Login"            → LoginScreen
│   ├── "Register"         → RegisterScreen
│   └── "ConsultantList"   → ConsultantListScreen
│
└── "MainTabs" (BottomTabNavigator) [requiere autenticacion]
    │
    ├── Tab "Inicio" (icon: home)
    │   └── HomeStack (NativeStackNavigator)
    │       ├── "Home"              → HomeScreen
    │       ├── "ProductDetail"     → ProductDetailScreen
    │       └── "Notifications"     → NotificationsScreen
    │
    ├── Tab "Tienda" (icon: shopping-bag)
    │   └── StoreStack (NativeStackNavigator)
    │       ├── "Store"             → StoreScreen
    │       └── "ProductDetail"     → ProductDetailScreen
    │
    ├── Tab "Carrito" (icon: shopping-cart)
    │   └── CartStack (NativeStackNavigator)
    │       ├── "Cart"              → CartScreen
    │       └── "Checkout"          → CheckoutScreen
    │
    └── Tab "Perfil" (icon: user)
        └── ProfileStack (NativeStackNavigator)
            ├── "Profile"           → ProfileScreen
            ├── "Orders"            → OrdersScreen
            └── "OrderTracking"     → OrderTrackingScreen
```

## Parametros de Navegacion

### ProductDetailScreen
```javascript
navigation.navigate('ProductDetail', {
  productId: number    // ID del producto WooCommerce
})
```

### OrderTrackingScreen
```javascript
navigation.navigate('OrderTracking', {
  orderId: number      // ID de la orden WooCommerce
})
```

### ConsultantListScreen
```javascript
navigation.navigate('ConsultantList')  // Sin parametros
```

## Configuracion de Tabs

| Tab | Label | Icono (Feather) | Badge |
|---|---|---|---|
| Inicio | "Inicio" | home | - |
| Tienda | "Tienda" | shopping-bag | - |
| Carrito | "Carrito" | shopping-cart | totalItems (CartContext) |
| Perfil | "Perfil" | user | - |

## Flujo de Autenticacion en Navegacion

```
App monta
    │
AuthContext.isLoading === true
    │ → Mostrar splash/loading
    │
isLoading === false
    │
    ├── user === null → Mostrar Login
    │   │
    │   ├── "Iniciar Sesion" → login() → user se establece → MainTabs
    │   ├── "Registrarse" → navigate('Register')
    │   └── "Buscar Consultora" → navigate('ConsultantList')
    │
    └── user !== null → Mostrar MainTabs
        │
        └── "Cerrar Sesion" (en ProfileScreen) → logout() → Login
```

## Header Personalizado

- HomeScreen: Logo "Aroma del Rosal" + icono de campana (notificaciones)
- Resto de pantallas: Header default de React Navigation con back button
- Color del tab activo: `#d11e51` (rosa)
- Color del tab inactivo: `#9ca3af` (gris)
