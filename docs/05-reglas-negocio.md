# Reglas de Negocio

## 1. Sistema de Descuentos

**Archivo:** `src/utils/discounts.js`

El sistema de descuentos tiene dos dimensiones: descuento por nivel del usuario y descuento por producto.

### 1.1 Descuento por Nivel de Usuario

Se evalua en orden de prioridad (el primero que aplique gana):

| Prioridad | Condicion | Descuento | Nivel |
|---|---|---|---|
| 1 | `_nivelpro_override_manual` = "yes" | `_nivelpro_override_porcentaje`% | `override` |
| 2 | Mes de febrero (promo especial) | 50% | `oro` |
| 3 | Usuario nuevo (primer mes desde registro) | 50% | `oro` |
| 4 | `_nivelpro_descuento_50_hasta` > fecha actual | 50% | `oro` |
| 5 | Default (siempre) | 50% | `base` |

### 1.2 Descuento por Producto (Sobreescribe nivel)

| Condicion | Efecto |
|---|---|
| `_es_precio_neto` = "yes" | 0% descuento (precio neto) |
| `_nivelpro_descuento_producto` tiene valor | Usa ese % en lugar del nivel |
| Ninguna meta especial | Usa descuento por nivel |

### 1.3 Formula de Calculo

```
precioFinal = precioOriginal × (1 - tasaDescuento)
```

Donde `tasaDescuento` es un valor entre 0 y 1 (ej: 0.5 para 50%).

### 1.4 Funcion Principal

```javascript
calcularPrecioFinal(product, user) → {
  precioOriginal: number,
  precioFinal: number,
  descuentoAplicado: number,      // Porcentaje aplicado
  tipoDescuento: string,          // 'neto' | 'especial' | 'nivel'
  montoDescuento: number           // Monto ahorrado
}
```

---

## 2. Validacion del Carrito

**Archivos:** `src/constants/cartRules.js`, `src/utils/cartValidation.js`

### 2.1 Reglas de Minimos

| Tipo de Cliente | Condicion | Minimo | Requiere Kit |
|---|---|---|---|
| **Nuevo** | `hasBoughtKit` = false | RD$25,000 | Si (ID 4994) |
| **Recurrente** | `hasBoughtKit` = true, activo | RD$5,000 | No |
| **Reactivacion** | +90 dias sin comprar | RD$20,000 | No |
| **Admin/Staff** | rol administrator | Sin minimo | No |

### 2.2 Constantes

```javascript
CART_RULES = {
  KIT_PRODUCT_ID: 4994,
  PREMIO_PRODUCT_ID: 6694,
  MIN_FIRST_ORDER: 25000,         // RD$ primera compra
  MIN_REGULAR_ORDER: 5000,        // RD$ compra regular
  MIN_REACTIVATION_ORDER: 20000,  // RD$ reactivacion
  DAYS_FOR_REACTIVATION: 90       // Dias de inactividad
}
```

### 2.3 Logica de Validacion

```
1. Si usuario es admin → VALIDO (sin restricciones)
2. Si usuario no ha comprado kit:
   a. Verificar que kit (4994) esta en el carrito
   b. Verificar total >= RD$25,000
3. Si usuario ha comprado kit:
   a. Calcular dias desde ultima compra
   b. Si >= 90 dias → total >= RD$20,000
   c. Si < 90 dias → total >= RD$5,000
```

---

## 3. Flujo de Autenticacion

**Archivo:** `src/context/AuthContext.js`

### 3.1 Login
```
1. Usuario ingresa email/password
2. POST /jwt-auth/v1/token → obtener JWT
3. POST /jwt-auth/v1/token/validate → validar JWT
4. GET /wp/v2/users/me → datos WordPress del usuario
5. GET /customers?email={email} → datos WooCommerce del cliente
6. Construir objeto User combinando ambas fuentes
7. Guardar JWT en AsyncStorage
8. Establecer user en AuthContext
```

### 3.2 Auto-login (App Init)
```
1. Leer JWT de AsyncStorage
2. Si existe → POST /jwt-auth/v1/token/validate
3. Si valido → GET /wp/v2/users/me + GET /customers?email=...
4. Si invalido → limpiar AsyncStorage, mostrar Login
```

### 3.3 Logout
```
1. Limpiar user del AuthContext
2. Eliminar JWT de AsyncStorage
3. Redirigir a LoginScreen
```

---

## 4. Flujo de Checkout

**Archivo:** `src/screens/CheckoutScreen.js`

```
1. Validar minimos del carrito (cartValidation.js)
2. Usuario completa formulario de direccion
   - Selecciona provincia (dropdown de provinces.js)
   - Selecciona ciudad (dropdown filtrado por provincia)
   - Ingresa direccion, telefono
3. [Si FLAI activo] Verificar disponibilidad de stock
4. [Si FLAI activo] Crear reservacion de stock
5. POST /orders → crear orden en WooCommerce
   - line_items con precios ya calculados con descuento
   - billing y shipping del formulario
   - customer_id del usuario logueado
6. Limpiar carrito (CartContext.clearCart)
7. Mostrar confirmacion con numero de orden
```

---

## 5. Calculo de Totales del Carrito

**Archivo:** `src/context/CartContext.js`

```
Para cada item del carrito:
  1. calcularPrecioFinal(product, user)
  2. Clasificar descuento:
     - tipoDescuento === 'neto' → sumar a totalNetos
     - tipoDescuento === 'especial' → agregar a discountEspeciales
     - tipoDescuento === 'nivel' → acumular en discountNivel
  3. Sumar precioFinal * quantity a totalConDescuento
  4. Sumar precioOriginal * quantity a subtotalOriginal

Resultado:
  subtotalOriginal - totalConDescuento = total descuentos aplicados
```

---

## 6. Productos Ocultos/Especiales

| Producto | ID | Regla |
|---|---|---|
| Kit Inicial | 4994 | Mostrado normalmente pero requerido para nuevas consultoras |
| Producto Premio | 6694 | Filtrado de todos los listados (HomeScreen, StoreScreen) |

---

## 7. Geolocalizacion (Provincias)

**Archivo:** `src/constants/provinces.js`

- 47 provincias de Republica Dominicana
- Cada provincia tiene lista de ciudades
- Usado en: CheckoutScreen, RegisterScreen, ConsultantListScreen
- Formato: `{ [codigoProvincia]: { nombre, ciudades: string[] } }`
