# Estado Global y Contextos

## Arquitectura de Estado

La app usa **React Context API** para estado global. No hay Redux, Zustand ni otras librerias de state management.

```
App.js
├── AuthProvider (AuthContext)
│   └── CartProvider (CartContext)  ← depende de AuthContext (user para descuentos)
│       └── AppNavigator
│           └── Screens y Components
```

---

## 1. AuthContext

**Archivo:** `src/context/AuthContext.js`

### Estado

| Campo | Tipo | Default | Descripcion |
|---|---|---|---|
| user | User \| null | null | Usuario autenticado o null |
| isLoading | boolean | true | Cargando validacion inicial de token |

### Valores Derivados

| Campo | Derivado de | Descripcion |
|---|---|---|
| isLoggedIn | `!!user` | Si hay sesion activa |

### Acciones Expuestas

| Funcion | Parametros | Retorno | Descripcion |
|---|---|---|---|
| login | (username, password) | void | Autentica via JWT, carga usuario |
| logout | () | void | Cierra sesion, limpia storage |
| refreshUserData | () | void | Recarga datos del usuario actual |
| isTokenValid | () | boolean | Valida token sin refrescar sesion |

### Persistencia

- **Key:** `@marykay_jwt_token`
- **Storage:** AsyncStorage
- **Contenido:** JWT token string
- **Auto-restore:** En montaje del provider, intenta restaurar sesion

### Flujo de Estado

```
[App Init]
  isLoading: true, user: null
       │
  Leer token de AsyncStorage
       │
  ┌────┴────┐
  │ No hay  │  Token existe
  │ token   │       │
  │         │  Validar JWT
  │         │       │
  │         │  ┌────┴────┐
  │         │  │ Invalido│  Valido
  │         │  │         │     │
  └────┬────┘  └────┬────┘  Cargar user
       │            │          │
  isLoading: false  │     isLoading: false
  user: null        │     user: {...}
                    │
              isLoading: false
              user: null
```

---

## 2. CartContext

**Archivo:** `src/context/CartContext.js`

### Estado

| Campo | Tipo | Default | Descripcion |
|---|---|---|---|
| cartItems | Array\<CartItem\> | [] | Items en el carrito |
| isRestored | boolean | false | Si el carrito fue restaurado de storage |

### Valores Calculados (useMemo)

| Campo | Tipo | Descripcion |
|---|---|---|
| totalItems | number | Suma de todas las cantidades |
| subtotalOriginal | number | Total sin descuentos |
| totalConDescuento | number | Total con todos los descuentos |
| discountNivel | Object \| null | Descuento por nivel del usuario |
| discountEspeciales | Array\<Object\> | Descuentos por producto especifico |
| totalNetos | number | Total de productos a precio neto |

### Acciones Expuestas

| Funcion | Parametros | Retorno | Descripcion |
|---|---|---|---|
| addToCart | (product, qty?) | void | Agrega producto o incrementa cantidad |
| removeFromCart | (productId) | void | Elimina producto del carrito |
| updateQuantity | (productId, newQty) | void | Establece cantidad exacta |
| incrementQuantity | (productId) | void | +1 a la cantidad |
| decrementQuantity | (productId) | void | -1 (elimina si qty=1) |
| clearCart | () | void | Vacia el carrito completo |
| getItemQuantity | (productId) | number | Consulta cantidad de un producto |

### Persistencia

- **Key:** `@marykay_cart`
- **Storage:** AsyncStorage
- **Contenido:** JSON string de `cartItems` array
- **Sync:** Se guarda automaticamente en cada cambio de `cartItems`
- **Restore:** Al montar el provider, carga carrito guardado

### Dependencia de AuthContext

CartContext usa el `user` de AuthContext para calcular descuentos:

```
cartItems cambia O user cambia
        │
   Para cada item:
     calcularPrecioFinal(item.product, user)
        │
   Recalcular todos los totales
        │
   Actualizar valores memoizados
```

---

## Patron de Uso en Componentes

```javascript
// En cualquier componente:
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function MiComponente() {
  const { user, isLoggedIn, login, logout } = useAuth();
  const { cartItems, totalItems, addToCart, clearCart } = useCart();
  // ...
}
```

---

## AsyncStorage Keys

| Key | Contexto | Contenido | Formato |
|---|---|---|---|
| `@marykay_jwt_token` | AuthContext | JWT token | string |
| `@marykay_cart` | CartContext | Items del carrito | JSON string |
