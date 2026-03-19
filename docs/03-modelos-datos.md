# Modelos de Datos

## 1. Usuario (AuthContext)

Modelo construido combinando datos de WordPress (JWT) y WooCommerce (Customer).

```javascript
User = {
  // Identidad
  id: number,                      // WordPress user ID
  customerId: number,              // WooCommerce customer ID
  email: string,
  displayName: string,
  firstName: string,
  lastName: string,
  token: string,                   // JWT token activo
  registeredDate: string,          // Fecha de registro ISO

  // Direccion de facturacion
  billing: {
    first_name: string,
    last_name: string,
    address_1: string,
    city: string,
    state: string,                 // Codigo de provincia (e.g. "SD")
    country: string,               // "DO"
    email: string,
    phone: string
  },

  // Direccion de envio
  shipping: {
    first_name: string,
    last_name: string,
    address_1: string,
    city: string,
    state: string,
    country: string
  },

  // Meta datos WooCommerce (raw)
  meta_data: Array<{ id: number, key: string, value: string }>,

  // Campos derivados de meta_data
  hasBoughtKit: boolean,           // meta "has_bought_kit" === "yes"
  lastPurchaseDate: string | null, // meta "_kit_last_purchase_date" (UNIX timestamp)
  discountLevel: string,           // 'base' | 'oro' | 'override'
  discountRate: number,            // 0 a 1 (ej: 0.5 = 50%)
  vigencia50: string | null,       // meta "_nivelpro_descuento_50_hasta" (fecha ISO)
  overrideManual: boolean,         // meta "_nivelpro_override_manual"
  overridePorcentaje: number,      // meta "_nivelpro_override_porcentaje" (0-100)
  salesCurrentMonth: number        // Ventas del mes actual (calculado)
}
```

### Meta Keys del Usuario en WooCommerce

| Key | Tipo Valor | Descripcion |
|---|---|---|
| `has_bought_kit` | "yes" / "no" | Si ha comprado el kit inicial |
| `_kit_last_purchase_date` | UNIX timestamp string | Fecha ultima compra de kit |
| `_nivelpro_descuento_50_hasta` | "YYYY-MM-DD" | Vigencia del descuento ORO |
| `_nivelpro_override_manual` | "yes" / "no" | Override manual activado |
| `_nivelpro_override_porcentaje` | "0" - "100" | Porcentaje override manual |

---

## 2. Producto (WooCommerce)

```javascript
Product = {
  id: number,
  name: string,
  description: string,             // Contenido HTML
  short_description: string,       // Resumen HTML
  regular_price: string,           // Precio string (ej: "1500.00")
  sale_price: string | "",         // Precio en oferta
  price: string,                   // Precio efectivo actual
  sku: string,                     // Codigo SKU
  stock_quantity: number | null,   // Cantidad en stock
  stock_status: string,            // "instock" | "outofstock"
  manage_stock: boolean,           // Si gestiona stock
  images: Array<{
    id: number,
    src: string,                   // URL de la imagen
    alt: string
  }>,
  categories: Array<{
    id: number,
    name: string,
    slug: string
  }>,
  meta_data: Array<{
    id: number,
    key: string,
    value: string
  }>,
  attributes: Array<Object>
}
```

### Meta Keys del Producto

| Key | Tipo Valor | Descripcion |
|---|---|---|
| `_nivelpro_descuento_producto` | "0" - "100" | Descuento especifico del producto (%) |
| `_es_precio_neto` | "yes" / "no" | Producto a precio neto (sin descuento) |

### IDs de Productos Especiales

| Producto | ID | Comportamiento |
|---|---|---|
| Kit Inicial | 4994 | Obligatorio para nuevas consultoras |
| Producto Premio | 6694 | Oculto en listados de productos |

---

## 3. Item del Carrito

```javascript
CartItem = {
  product: Product,                // Referencia completa al producto
  quantity: number                 // Cantidad (min 1, max 99)
}
```

---

## 4. Totales del Carrito (Calculados)

```javascript
CartTotals = {
  totalItems: number,              // Suma de cantidades

  subtotalOriginal: number,        // Suma de (regular_price * quantity)

  totalConDescuento: number,       // Total despues de TODOS los descuentos

  discountNivel: {                 // Descuento por nivel del usuario
    porcentaje: number,            // Ej: 50
    monto: number                  // Monto ahorrado en RD$
  } | null,

  discountEspeciales: Array<{      // Descuentos por producto especifico
    porcentaje: number,
    monto: number
  }>,

  totalNetos: number               // Total de productos a precio neto
}
```

---

## 5. Orden (WooCommerce)

```javascript
Order = {
  id: number,
  status: string,                  // Ver estados abajo
  date_created: string,            // ISO datetime
  total: string,                   // Total de la orden
  subtotal: string,
  customer_id: number,

  line_items: Array<{
    id: number,
    product_id: number,
    name: string,
    quantity: number,
    total: string,                 // Total del line item
    subtotal: string,
    price: number
  }>,

  billing: BillingAddress,
  shipping: ShippingAddress,

  shipping_lines: Array<{
    method_id: string,
    method_title: string,
    total: string
  }>,

  meta_data: Array<{ key: string, value: string }>
}
```

### Estados de Orden

| Estado | Etiqueta | Descripcion |
|---|---|---|
| `pending` | Pendiente | Orden creada, pendiente de pago |
| `processing` | En proceso | Pago recibido, procesando envio |
| `on-hold` | En espera | Esperando accion manual |
| `completed` | Completada | Orden entregada |
| `cancelled` | Cancelada | Orden cancelada |
| `refunded` | Reembolsada | Dinero devuelto |
| `failed` | Fallida | Pago fallido |

---

## 6. Notificacion (Local/Estatica)

```javascript
Notification = {
  id: string,                      // ID unico
  title: string,                   // Titulo de la notificacion
  message: string,                 // Contenido
  date: string,                    // Fecha legible (ej: "Hace 2 dias")
  read: boolean,                   // Leida o no
  type: string                     // "welcome" | "product" | "goal" | "promo" | "order"
}
```

> Nota: Las notificaciones son actualmente hardcoded, no provienen de una API.

---

## 7. Consultora (Derivado de Customer)

```javascript
Consultant = {
  id: number,                      // WooCommerce customer ID
  nombre: string,                  // Nombre completo
  email: string,
  telefono: string,                // Numero de telefono
  ciudad: string,                  // Ciudad de billing
  state: string,                   // Provincia (codigo)
  iniciales: string                // 2 letras iniciales del nombre
}
```

---

## 8. Categoria (WooCommerce)

```javascript
Category = {
  id: number,
  name: string,
  slug: string,
  parent: number,                  // 0 si es raiz
  count: number,                   // Cantidad de productos
  image: {
    id: number,
    src: string
  } | null
}
```

---

## 9. Direccion (Billing/Shipping)

```javascript
BillingAddress = {
  first_name: string,
  last_name: string,
  address_1: string,
  city: string,
  state: string,                   // Codigo provincia RD
  country: string,                 // "DO"
  email: string,
  phone: string
}

ShippingAddress = {
  first_name: string,
  last_name: string,
  address_1: string,
  city: string,
  state: string,
  country: string
}
```

---

## Diagrama de Relaciones

```
User (1) ────── (N) Order
  │                    │
  │                    ├── (N) LineItem ──── (1) Product
  │                    │
  │                    ├── (1) BillingAddress
  │                    └── (1) ShippingAddress
  │
  ├── (1) BillingAddress
  ├── (1) ShippingAddress
  └── (N) meta_data

Product (N) ────── (N) Category
  │
  ├── (N) Image
  └── (N) meta_data

CartItem (N) ────── (1) Product
```
