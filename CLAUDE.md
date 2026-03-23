# CLAUDE.md - Aroma del Rosal

## Proyecto

App mobile e-commerce para consultoras Mary Kay en Republica Dominicana.
Stack: React Native (Expo 54) + JavaScript (sin TypeScript) + WooCommerce API + WordPress JWT Auth.

## Reglas de Desarrollo

### Estructura de Archivos
- Todo el codigo fuente va en `src/`
- API clients en `src/api/`
- Componentes reutilizables en `src/components/`
- Constantes y configuracion en `src/constants/`
- Contextos globales en `src/context/`
- Navegacion en `src/navigation/`
- Pantallas en `src/screens/`
- Utilidades en `src/utils/`

### Convenciones de Codigo
- JavaScript puro, NO TypeScript
- Componentes funcionales con hooks (no clases)
- Estado global via React Context (AuthContext, CartContext) - no Redux/Zustand
- Estilos con `StyleSheet.create()` al final de cada archivo
- Idioma de UI: Espanol
- Moneda: RD$ (Pesos Dominicanos)
- Pais: DO (Republica Dominicana)

### Colores del Tema
- Primario: `#d11e51` (rosa Mary Kay)
- Fondo: `#f8f8f8`
- Texto: `#1a1a2e`
- Texto secundario: `#6b7280`
- Borde: `#e5e7eb`
- Exito: `#10b981`
- Alerta: `#f59e0b`
- Error: `#ef4444`

### APIs Externas
- **WooCommerce REST API v3**: Productos, ordenes, clientes, categorias
  - Base: `https://aromadelrosalinvestments.com/wp-json/wc/v3`
  - Auth: Basic Auth con Consumer Key/Secret
- **WordPress JWT**: Autenticacion de usuarios
  - Base: `https://aromadelrosalinvestments.com/wp-json`
  - Endpoints: `/jwt-auth/v1/token`, `/jwt-auth/v1/token/validate`
- **FLAI**: Sistema externo de inventario (actualmente bypassed con FLAI_BYPASS=true)
  - Base: `https://cel.flai.com.do`

### Reglas de Negocio Criticas
- **Descuentos**: Se calculan en `src/utils/discounts.js`. Hay 3 niveles:
  1. Override manual (meta `_nivelpro_override_manual`) - maxima prioridad
  2. Nivel ORO (meta `_nivelpro_descuento_50_hasta`) - 50%
  3. Base - 50%
  4. Producto especifico (meta `_nivelpro_descuento_producto`) sobreescribe el nivel
  5. Precio neto (meta `_es_precio_neto`) = 0% descuento
- **Minimos de carrito** (en `src/constants/cartRules.js`):
  - Cliente nuevo: Kit (ID 4994) + RD$25,000
  - Cliente recurrente: RD$10,000
  - Reactivacion (+90 dias): RD$20,000
  - Admin/Staff: sin minimo
- **Producto Kit ID**: 4994 (obligatorio para nuevas consultoras)
- **Producto Premio ID**: 6694 (oculto en listados)

### Persistencia Local
- `@marykay_jwt_token` → Token JWT en AsyncStorage
- `@marykay_cart` → Carrito serializado en AsyncStorage

### Navegacion
- Bottom tabs: Inicio, Tienda, Carrito, Perfil
- Cada tab tiene su propio stack de navegacion
- LoginScreen, RegisterScreen y ConsultantListScreen son pantallas fuera de tabs

### Advertencias
- Variables de entorno configuradas via `.env` + `app.config.js` (credenciales NO hardcodeadas)
- FLAI esta bypassed (FLAI_BYPASS = true en flai.js) - Fase 2
- Las notificaciones son estaticas (hardcoded en NotificationsScreen)
- Los banners son estaticos (hardcoded en BannerCarousel)
- Envio no calculado (muestra "Por calcular")
- RegisterScreen tiene formulario pero NO llama API real
- No hay tests unitarios ni de integracion

### Comandos
```bash
npm start        # Servidor de desarrollo Expo
npm run android  # Abrir en emulador Android
npm run ios      # Abrir en simulador iOS
npm run web      # Vista web
```
