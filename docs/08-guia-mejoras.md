# Guia para Mejoras y Cambios

## Deuda Tecnica Conocida

### Seguridad (Critico)
- [ ] **Credenciales hardcoded**: Consumer Key/Secret en `src/constants/config.js` y credenciales FLAI en `src/api/flai.js`. Migrar a variables de entorno con `expo-constants` o `react-native-dotenv`.
- [ ] **Sin HTTPS certificate pinning**: Las llamadas API no validan certificados.

### Contenido Estatico
- [ ] **Banners hardcoded** en `HomeScreen.js` - Migrar a CMS o API
- [ ] **Notificaciones hardcoded** en `NotificationsScreen.js` - Implementar sistema de notificaciones real (push notifications con Expo Notifications)
- [ ] **Pasos de tracking hardcoded** en `OrderTrackingScreen.js` - Conectar con estados reales de WooCommerce

### Funcionalidad Pendiente
- [ ] **CartBadge** (`src/components/CartBadge.js`) - Componente placeholder sin implementar
- [ ] **FLAI bypassed** - Integracion de inventario desactivada (`FLAI_BYPASS = true`)
- [ ] **Sin push notifications** - Solo notificaciones locales estaticas
- [ ] **Sin busqueda offline** - Requiere conexion para todo
- [ ] **Sin cache de imagenes** - Las imagenes se recargan cada vez
- [ ] **Sin manejo de errores global** - Error boundaries no implementados

### Rendimiento
- [ ] **Sin cache de API** - Todas las llamadas van al servidor
- [ ] **Imagenes sin optimizar** - No hay thumbnails ni carga progresiva
- [ ] **Sin lazy loading** de pantallas

---

## Como Hacer Cambios

### Agregar una Nueva Pantalla

1. Crear archivo en `src/screens/NuevaPantalla.js`
2. Registrar en el stack correspondiente en `src/navigation/AppNavigator.js`
3. Seguir el patron de componente funcional con hooks
4. Usar colores de `src/constants/colors.js`

### Agregar un Nuevo Componente

1. Crear archivo en `src/components/NuevoComponente.js`
2. Exportar como default
3. Documentar props en este archivo (`docs/04-componentes.md`)

### Modificar Reglas de Descuento

1. Editar `src/utils/discounts.js` (funcion `calcularPrecioFinal`)
2. Si hay nuevas meta keys, documentar en `docs/03-modelos-datos.md`
3. Verificar que `CartContext.js` recalcula correctamente

### Modificar Reglas del Carrito

1. Editar constantes en `src/constants/cartRules.js`
2. Editar logica en `src/utils/cartValidation.js`
3. Documentar cambios en `docs/05-reglas-negocio.md`

### Agregar Nuevo Endpoint API

1. Agregar funcion en `src/api/woocommerce.js` o crear nuevo cliente en `src/api/`
2. Documentar contrato en `docs/02-contratos-api.md`
3. Manejar errores con try/catch y mensajes en espanol

### Agregar Nueva Provincia/Ciudad

1. Editar `src/constants/provinces.js`
2. Agregar codigo de provincia y lista de ciudades

---

## Convenciones a Seguir

1. **Idioma de UI**: Todo en espanol
2. **Moneda**: Siempre usar `RD$` como prefijo
3. **Estilos**: `StyleSheet.create()` al final del archivo
4. **Estado**: React Context, no instalar Redux/Zustand
5. **HTTP**: axios con timeout de 15 segundos
6. **Errores**: Mensajes amigables en espanol, no mostrar stack traces
7. **Imagenes**: Usar `expo-image` (Image de expo-image), no `Image` de react-native
8. **Iconos**: Feather icons via `@expo/vector-icons`
9. **Navegacion**: React Navigation 7.x, native-stack para stacks

---

## Indice de Documentos

| # | Documento | Descripcion |
|---|---|---|
| 01 | [Arquitectura](./01-arquitectura.md) | Vision general del sistema, capas, dependencias |
| 02 | [Contratos API](./02-contratos-api.md) | Endpoints, request/response, autenticacion |
| 03 | [Modelos de Datos](./03-modelos-datos.md) | Schemas de User, Product, Order, Cart, etc. |
| 04 | [Componentes](./04-componentes.md) | Catalogo de componentes y pantallas con props |
| 05 | [Reglas de Negocio](./05-reglas-negocio.md) | Descuentos, minimos, checkout, autenticacion |
| 06 | [Estado y Contextos](./06-estado-y-contextos.md) | AuthContext, CartContext, persistencia |
| 07 | [Navegacion](./07-navegacion.md) | Estructura de rutas y parametros |
| 08 | [Guia de Mejoras](./08-guia-mejoras.md) | Este documento |
