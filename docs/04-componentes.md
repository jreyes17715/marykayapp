# Catalogo de Componentes

## Componentes Reutilizables (`src/components/`)

---

### BannerCarousel
**Archivo:** `src/components/BannerCarousel.js`
**Props:** Ninguna

Carrusel auto-rotativo con indicadores de posicion (dots). Muestra banners promocionales.

**Comportamiento:**
- Auto-scroll cada 4 segundos
- 3 slides hardcoded con fondo rosa/negro
- Indicadores de posicion interactivos
- Texto y subtitulo por slide

**Dependencias:** `react-native-swiper-flatlist`

---

### CartBadge
**Archivo:** `src/components/CartBadge.js`
**Props:** Ninguna
**Estado:** Placeholder sin implementar

---

### CategoryList
**Archivo:** `src/components/CategoryList.js`

| Prop | Tipo | Requerido | Descripcion |
|---|---|---|---|
| categories | Array\<Category\> | Si | Lista de categorias |
| onSelectCategory | Function(id) | Si | Callback al seleccionar |

**Comportamiento:**
- Lista horizontal scrollable de chips
- Chip "Todos" siempre presente al inicio
- Resalta la categoria seleccionada con color primario
- Scroll horizontal sin barra

---

### DropdownSelector
**Archivo:** `src/components/DropdownSelector.js`

| Prop | Tipo | Requerido | Default | Descripcion |
|---|---|---|---|---|
| label | string | Si | - | Titulo del modal |
| value | string | Si | - | Valor seleccionado |
| options | Array\<string\> | Si | - | Opciones disponibles |
| onSelect | Function(string) | Si | - | Callback al seleccionar |
| disabled | boolean | No | false | Deshabilitar interaccion |
| placeholder | string | No | "Seleccionar" | Texto placeholder |
| hasError | boolean | No | false | Borde rojo de error |

**Comportamiento:**
- Abre modal con lista de opciones
- Muestra icono chevron-down
- Borde rojo cuando `hasError=true`
- Opacidad reducida cuando `disabled=true`

---

### LoadingSpinner
**Archivo:** `src/components/LoadingSpinner.js`

| Prop | Tipo | Requerido | Default | Descripcion |
|---|---|---|---|---|
| message | string | No | "Cargando..." | Texto bajo el spinner |
| size | string | No | "large" | Tamano del ActivityIndicator |

**Comportamiento:**
- Centrado vertical y horizontal
- Color primario (#d11e51)
- Texto gris debajo del spinner

---

### ProductCard
**Archivo:** `src/components/ProductCard.js`

| Prop | Tipo | Requerido | Descripcion |
|---|---|---|---|
| product | Product | Si | Objeto producto WooCommerce |
| onPress | Function | Si | Callback al tocar la tarjeta |

**Comportamiento:**
- Imagen del producto con placeholder de carga
- Nombre del producto (max 2 lineas)
- Precio con descuento tachado si aplica
- Badge de tipo de descuento (Neto/Especial/Nivel)
- Estado de stock (En stock / Agotado)
- Boton "Agregar" o controles de cantidad (+/-) si ya esta en carrito
- Muestra "Inicia sesion para ver precio" si no hay usuario autenticado
- Imagen con timeout de 15s y fallback a placeholder

**Contextos usados:** AuthContext, CartContext

---

### QuantitySelector
**Archivo:** `src/components/QuantitySelector.js`

| Prop | Tipo | Requerido | Default | Descripcion |
|---|---|---|---|---|
| value | number | Si | - | Cantidad actual |
| onIncrement | Function | Si | - | Callback al incrementar |
| onDecrement | Function | Si | - | Callback al decrementar |
| min | number | No | 1 | Valor minimo |
| max | number | No | 99 | Valor maximo |
| size | string | No | "medium" | "small" o "medium" |

**Comportamiento:**
- Botones - y + con valor centrado
- Deshabilita boton - al llegar a `min`
- Deshabilita boton + al llegar a `max`
- Tamano "small" para uso dentro de ProductCard

---

## Pantallas (`src/screens/`)

### HomeScreen
- Barra superior con logo y campana de notificaciones
- BannerCarousel
- Seccion "Productos Destacados" (primeros 6 productos)
- Navegacion a ProductDetail y Notifications

### StoreScreen
- Barra de busqueda con debounce de 500ms
- CategoryList para filtrado
- Grid de ProductCards (2 columnas)
- Scroll infinito con paginacion (20 por pagina)
- Pull-to-refresh

### CartScreen
- Lista de items del carrito con controles de cantidad
- Resumen de totales y descuentos
- Validacion de minimos de carrito
- Boton de checkout (deshabilitado si no cumple minimos)

### CheckoutScreen
- Formulario de direccion (provincia/ciudad con DropdownSelector)
- Seleccion de metodo de envio
- Resumen de la orden
- Boton de confirmar pedido
- Integracion FLAI para reserva de stock (bypassed)

### LoginScreen
- Campos email y contrasena
- Boton de login
- Links a registro y lista de consultoras

### RegisterScreen
- Formulario de registro de nueva consultora
- Campos: nombre, email, telefono, provincia, ciudad, contrasena

### ConsultantListScreen
- Busqueda de consultoras por provincia/ciudad
- Lista de consultoras con datos de contacto

### ProfileScreen
- Datos del usuario
- Nivel de descuento actual
- Estadisticas del mes
- Boton de cerrar sesion

### OrdersScreen
- Lista de ordenes del usuario
- Estado de cada orden con colores
- Paginacion

### OrderTrackingScreen
- Timeline de 4 pasos del estado de la orden
- Detalle de productos de la orden

### ProductDetailScreen
- Imagen grande del producto
- Nombre, precio, descripcion
- Calculo de descuento
- Controles de cantidad
- Boton agregar al carrito

### NotificationsScreen
- Lista de notificaciones (hardcoded)
- Iconos por tipo de notificacion
- Indicador de leida/no leida
