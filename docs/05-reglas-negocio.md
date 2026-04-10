# Reglas de Negocio

## 1. Sistema de Descuentos

**Archivo:** `src/utils/discounts.js`

El sistema de descuentos tiene dos dimensiones: descuento por nivel del usuario y descuento por producto.

### 1.1 Descuento por Nivel de Usuario

Se evalua en orden de prioridad (el primero que aplique gana):

| Prioridad | Condicion | Descuento | Nivel |
|---|---|---|---|
| 1 | `overrideManual` = true y `overridePorcentaje` > 0 | `overridePorcentaje`% | MANUAL (X%) |
| 2 | Mes de febrero (promo especial) | 50% | ORO (50%) - Promo |
| 3 | Usuario nuevo (primer mes desde registro) | 50% | ORO (50%) - Bienvenida |
| 4 | `vigencia50` > fecha actual | 50% | ORO (50%) |
| 5 | Default (siempre) | 50% | ORO (50%) |

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
  precioOriginal, precioFinal, descuento,
  porcentaje, esNeto, origen, tieneDescuento
}
```

---

## 2. Estados de Consultora (State Machine)

**Archivos:** `src/utils/consultantState.js`, `src/constants/cartRules.js`

### 2.1 Estados

| Estado | Descripcion | Puede Comprar | Prioridad de evaluacion |
|---|---|---|---|
| **BLOCKED** | Flag admin `ud_is_deactivated='1'`. Suspension inmediata | No (pantalla bloqueada) | 1 — maxima |
| **NEW** | No ha comprado kit. Primera compra pendiente | Si (con kit obligatorio) | 2 |
| **ACTIVE** | Consultora activa con kit comprado | Si | 3 |
| **INACTIVE** | Sin compra calificada en 3 meses rolling | Si (minimo RD$20,000) | 4 |
| **PENALIZED** | Estado legacy (reemplazado por INACTIVE para nuevas evaluaciones) | Si (minimo RD$20,000) | 5 |
| **DISABLED** | Inhabilitada (inactiva 6+ meses sin comprar) | No | 6 |

> **BLOCKED** no es un estado de transicion en la maquina de estados. Es un flag de prioridad maxima evaluado por `resolveRestrictionState()` antes de cualquier otra condicion.

### 2.2 Transiciones

```
NEW ──[compra kit + RD$20,000]──> ACTIVE
ACTIVE ──[3 meses rolling sin compra >= RD$20,000]──> INACTIVE
INACTIVE ──[compra >= RD$20,000]──> ACTIVE
NEW ──[6+ meses sin comprar]──> DISABLED
DISABLED ──[soporte + override]──> ACTIVE
```

### 2.3 Almacenamiento

- Meta WooCommerce: `consultant_state` en el customer
- Meta WordPress: `ud_is_deactivated` (plugin user-deactivator) — controla BLOCKED
- Meta WooCommerce: `_kit_last_active_purchase_ts` (unix timestamp) — controla rolling window INACTIVE
- Fallback legacy: si no existe `consultant_state`, se deriva de `hasBoughtKit`:
  - `hasBoughtKit: false` → NEW
  - `hasBoughtKit: true` → ACTIVE

### 2.4 Constantes

```javascript
CONSULTANT_STATES = { NEW: 'new', ACTIVE: 'active', PENALIZED: 'penalized', INACTIVE: 'inactive', DISABLED: 'disabled', BLOCKED: 'blocked' }
DISABLED_MONTHS = 6          // Meses de inactividad para DISABLED
INACTIVE_WINDOW_MONTHS = 3   // Meses rolling para evaluar INACTIVE
```

---

## 3. Validacion del Carrito

**Archivos:** `src/constants/cartRules.js`, `src/utils/cartValidation.js`

### 3.1 Reglas de Minimos por Estado

| Estado | Minimo | Requiere Kit | Calculo del Total | Nota |
|---|---|---|---|---|
| **BLOCKED** | Bloqueado | N/A | N/A | No puede operar la app |
| **NEW** | RD$20,000 | Si (ID 4994, auto-inyectado, no removible) | Interno: suma precioFinal de items (excluye kit y premio) | Kit se inyecta automaticamente |
| **ACTIVE** | RD$1,000 | No | Interno: `calcularTotalSeccion2` (solo productos con descuento, no netos) | Seccion 2 = productos con descuento |
| **INACTIVE** | RD$20,000 | No | Parametro `totalConDescuento - premioTotal` | Reactivacion rolling |
| **PENALIZED** | RD$20,000 | No | Parametro `totalConDescuento - premioTotal` | Estado legacy |
| **DISABLED** | Bloqueado | N/A | N/A | No puede comprar |
| **Admin/Staff** | Sin minimo | No | N/A | Sin restricciones |

### 3.2 Constantes

```javascript
KIT_PRODUCT_ID = 4994
PREMIO_PRODUCT_ID = 6694
MIN_AMOUNT_NEW = 20000        // RD$ primera compra (sin kit, sin premio)
MIN_AMOUNT_ACTIVE = 1000      // RD$ compra regular (solo seccion 2)
MIN_AMOUNT_PENALIZED = 20000  // RD$ reactivacion (legacy)
MIN_AMOUNT_INACTIVE = 20000   // RD$ reactivacion rolling
```

### 3.3 Logica de Validacion

```
1. Si usuario es null → VALIDO (guest)
2. Si usuario es admin/staff → VALIDO (sin restricciones)
3. Evaluar estado via resolveRestrictionState(user)
4. Si BLOCKED → INVALIDO (type: 'blocked') — pantalla de bloqueo
5. Si DISABLED → INVALIDO (type: 'disabled')
6. Si NEW:
   a. Verificar kit (4994) en carrito → si no: type 'missing_kit'
   b. Calcular total (excluyendo kit y premio) con calcularPrecioFinal
   c. Si total < 20,000 → INVALIDO (type: 'new_customer', gap: diferencia)
7. Si ACTIVE:
   a. Calcular total seccion 2 (productos con descuento, excluyendo premio)
   b. Si totalS2 < 1,000 → INVALIDO (type: 'active', gap: diferencia)
8. Si INACTIVE o PENALIZED:
   a. total = totalConDescuento - premioTotal
   b. Si total < 20,000 → INVALIDO (type: 'inactive'/'penalized', gap: diferencia)
```

---

## 4. Evaluacion de Inactividad Rolling

**Archivo:** `src/utils/consultantState.js`, evaluada en `src/context/AuthContext.js`

> Reemplaza el sistema de trimestres calendario fijos (Ene-Mar, Abr-Jun, etc.). Activo desde 2026-04-10.

### 4.1 Ventana Rolling de 3 Meses

- Se toma el timestamp de la ultima compra calificada desde `_kit_last_active_purchase_ts` (meta WooCommerce, unix timestamp)
- Si `ahora - _kit_last_active_purchase_ts > 3 meses` → consultora pasa a INACTIVE
- Si el meta no existe, se evalua por historial de ordenes (fallback legacy)

### 4.2 Inactividad

- Si una consultora ACTIVE no registra compra >= RD$20,000 en los ultimos 3 meses rolling → pasa a INACTIVE
- Solo se cuentan ordenes con status `completed` o `processing`
- Se evalua **al login** via `resolveRestrictionState()` (no hay cron ni background task)

### 4.3 Reactivacion desde INACTIVE

- Al completar una compra >= RD$20,000 → vuelve a ACTIVE
- Se actualiza `_kit_last_active_purchase_ts` con timestamp Unix del momento de la orden
- No requiere intervencion de soporte

### 4.4 Constantes

```javascript
INACTIVE_WINDOW_MONTHS = 3            // Meses rolling para evaluar INACTIVE
QUARTERLY_THRESHOLD = 20000           // Minimo de compra calificada para mantener/reactivar ACTIVE
REWARD_QUARTERLY_THRESHOLD = 60000    // Minimo trimestral para premio
```

---

## 5. Producto Premio (Reward Trimestral)

**Archivos:** `src/constants/cartRules.js`, `src/context/CartContext.js`

- Producto ID 6694, filtrado de listados publicos
- Se otorga **una vez** cuando la consultora acumula >= RD$60,000 en un trimestre
- Controlado por meta `reward_available` y `reward_redeemed` en el customer
- Se auto-inyecta en el carrito cuando `user.rewardAvailable === true`
- Al crear la orden, se marca `reward_redeemed` en WooCommerce
- Excluido de todos los calculos de minimos

---

## 6. Flujo de Autenticacion

**Archivo:** `src/context/AuthContext.js`

### 6.1 Login
```
1. Usuario ingresa email/password
2. POST /jwt-auth/v1/token → obtener JWT
3. POST /jwt-auth/v1/token/validate → validar JWT
4. GET /wp/v2/users/me → datos WordPress del usuario
5. GET /customers?email={email} → datos WooCommerce del cliente
6. Construir objeto User combinando ambas fuentes
7. Evaluar estado efectivo via resolveRestrictionState(user) — revisa BLOCKED, luego INACTIVE rolling, luego estado base
8. Verificar elegibilidad de premio trimestral
9. Si estado BLOCKED → mostrar pantalla de bloqueo, no permitir operacion
10. Si estado DISABLED → bloquear login con Alert
11. Guardar JWT en AsyncStorage
12. Establecer user en AuthContext
```

### 6.2 Auto-login (App Init)
```
1. Leer JWT de AsyncStorage
2. Si existe → POST /jwt-auth/v1/token/validate
3. Si valido → GET /wp/v2/users/me + GET /customers?email=...
4. Evaluar estado y trimestre (igual que login)
5. Si invalido → limpiar AsyncStorage, mostrar Login
```

### 6.3 Logout
```
1. Limpiar user del AuthContext
2. Eliminar JWT de AsyncStorage
3. Redirigir a LoginScreen
```

---

## 7. Flujo de Checkout

**Archivo:** `src/screens/CheckoutScreen.js`

```
1. Validar minimos del carrito segun estado (cartValidation.js)
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
6. Si consultora NEW y compro kit → transicion a ACTIVE
7. Si consultora PENALIZED o INACTIVE y compro >= 20k → transicion a ACTIVE, actualizar `_kit_last_active_purchase_ts`
8. Si premio en carrito → marcar reward_redeemed
9. Limpiar carrito (CartContext.clearCart)
10. Mostrar confirmacion con numero de orden
```

---

## 8. Calculo de Totales del Carrito

**Archivo:** `src/context/CartContext.js`

```
Para cada item del carrito:
  1. calcularPrecioFinal(product, user)
  2. Sumar precioFinal * quantity a totalConDescuento
  3. Sumar precioOriginal * quantity a subtotalOriginal
  4. Detectar si es premio (excluir de totalSinPremio)

Resultado:
  subtotalOriginal - totalConDescuento = total descuentos aplicados
  totalSinPremio = totalConDescuento - premioTotal
```

---

## 9. Productos Ocultos/Especiales

| Producto | ID | Regla |
|---|---|---|
| Kit Inicial | 4994 | Auto-inyectado para NEW, no removible, requerido en primera compra |
| Producto Premio | 6694 | Filtrado de listados. Auto-inyectado cuando rewardAvailable. Excluido de minimos |

---

## 10. Geolocalizacion (Provincias)

**Archivo:** `src/constants/provinces.js`

- 47 provincias de Republica Dominicana
- Cada provincia tiene lista de ciudades
- Usado en: CheckoutScreen, ConsultantListScreen
- Formato: `{ [codigoProvincia]: { nombre, ciudades: string[] } }`
