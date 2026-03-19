# Contratos de API

## 1. WooCommerce REST API v3

**Base URL:** `https://aromadelrosalinvestments.com/wp-json/wc/v3`
**Autenticacion:** Basic Auth (Consumer Key / Consumer Secret)
**Cliente:** `src/api/woocommerce.js`

---

### 1.1 Productos

#### GET /products
Obtiene lista paginada de productos.

**Parametros Query:**
| Param | Tipo | Default | Descripcion |
|---|---|---|---|
| per_page | number | 20 | Productos por pagina |
| page | number | 1 | Numero de pagina |
| category | number | - | Filtrar por ID de categoria |
| search | string | - | Busqueda por texto |
| orderby | string | "date" | Campo de ordenamiento |
| order | string | "desc" | Direccion (asc/desc) |

**Response:** `Array<Product>`

```json
[
  {
    "id": 1234,
    "name": "Crema Hidratante TimeWise",
    "description": "<p>Descripcion HTML...</p>",
    "regular_price": "1500.00",
    "sale_price": "",
    "price": "1500.00",
    "sku": "SKU-001",
    "stock_quantity": 25,
    "stock_status": "instock",
    "manage_stock": true,
    "images": [
      { "id": 100, "src": "https://...", "alt": "" }
    ],
    "categories": [
      { "id": 15, "name": "Cuidado de la Piel", "slug": "cuidado-piel" }
    ],
    "meta_data": [
      { "id": 500, "key": "_nivelpro_descuento_producto", "value": "30" },
      { "id": 501, "key": "_es_precio_neto", "value": "no" }
    ],
    "attributes": []
  }
]
```

#### GET /products/{id}
Obtiene detalle de un producto.

**Response:** `Product` (mismo schema que arriba)

---

### 1.2 Categorias

#### GET /products/categories
Lista todas las categorias de productos.

**Parametros Query:**
| Param | Tipo | Default | Descripcion |
|---|---|---|---|
| per_page | number | 100 | Categorias por pagina |
| hide_empty | boolean | true | Ocultar categorias vacias |

**Response:**
```json
[
  {
    "id": 15,
    "name": "Cuidado de la Piel",
    "slug": "cuidado-piel",
    "parent": 0,
    "count": 42,
    "image": { "id": 200, "src": "https://..." }
  }
]
```

---

### 1.3 Ordenes

#### POST /orders
Crea una nueva orden.

**Request Body:**
```json
{
  "customer_id": 123,
  "payment_method": "bacs",
  "payment_method_title": "Transferencia Bancaria",
  "set_paid": false,
  "billing": {
    "first_name": "Maria",
    "last_name": "Perez",
    "address_1": "Calle Principal #10",
    "city": "Santo Domingo",
    "state": "SD",
    "country": "DO",
    "email": "maria@email.com",
    "phone": "809-555-1234"
  },
  "shipping": {
    "first_name": "Maria",
    "last_name": "Perez",
    "address_1": "Calle Principal #10",
    "city": "Santo Domingo",
    "state": "SD",
    "country": "DO"
  },
  "line_items": [
    {
      "product_id": 1234,
      "quantity": 2,
      "total": "1500.00"
    }
  ],
  "shipping_lines": [
    {
      "method_id": "flat_rate",
      "method_title": "Envio Nacional",
      "total": "350.00"
    }
  ],
  "meta_data": [
    { "key": "order_comments", "value": "Notas del pedido" }
  ]
}
```

**Response:** `Order` (objeto completo con ID asignado)

#### GET /orders
Obtiene ordenes de un cliente.

**Parametros Query:**
| Param | Tipo | Descripcion |
|---|---|---|
| customer | number | ID del cliente WooCommerce |
| per_page | number | Ordenes por pagina |
| page | number | Numero de pagina |
| orderby | string | Campo de ordenamiento |
| order | string | Direccion (asc/desc) |

**Response:** `Array<Order>`

```json
[
  {
    "id": 5678,
    "status": "processing",
    "date_created": "2026-03-15T10:30:00",
    "total": "3500.00",
    "subtotal": "3150.00",
    "customer_id": 123,
    "line_items": [
      {
        "id": 1,
        "product_id": 1234,
        "name": "Crema Hidratante",
        "quantity": 2,
        "total": "1500.00"
      }
    ],
    "billing": { "...": "..." },
    "shipping": { "...": "..." }
  }
]
```

**Estados de orden validos:**
- `pending` - Pendiente de pago
- `processing` - En proceso
- `on-hold` - En espera
- `completed` - Completada
- `cancelled` - Cancelada
- `refunded` - Reembolsada
- `failed` - Fallida

---

### 1.4 Clientes

#### GET /customers?email={email}
Busca cliente por email.

**Response:** `Array<Customer>` (normalmente 0 o 1 resultado)

```json
[
  {
    "id": 123,
    "email": "maria@email.com",
    "first_name": "Maria",
    "last_name": "Perez",
    "billing": {
      "first_name": "Maria",
      "last_name": "Perez",
      "address_1": "Calle Principal #10",
      "city": "Santo Domingo",
      "state": "SD",
      "country": "DO",
      "email": "maria@email.com",
      "phone": "809-555-1234"
    },
    "shipping": { "...": "..." },
    "meta_data": [
      { "key": "has_bought_kit", "value": "yes" },
      { "key": "_kit_last_purchase_date", "value": "1710460800" },
      { "key": "_nivelpro_descuento_50_hasta", "value": "2026-06-15" },
      { "key": "_nivelpro_override_manual", "value": "no" },
      { "key": "_nivelpro_override_porcentaje", "value": "0" }
    ]
  }
]
```

#### GET /customers (paginado)
Lista todos los clientes. Usado para la pantalla de consultoras.

**Parametros Query:**
| Param | Tipo | Default | Descripcion |
|---|---|---|---|
| per_page | number | 100 | Clientes por pagina |
| page | number | 1 | Numero de pagina |
| role | string | "all" | Filtrar por rol |

---

## 2. WordPress JWT Authentication

**Base URL:** `https://aromadelrosalinvestments.com/wp-json`
**Cliente:** `src/api/woocommerce.js` (funciones loginUser, validateToken, getCurrentWPUser)

---

### 2.1 Login

#### POST /jwt-auth/v1/token

**Request Body:**
```json
{
  "username": "maria@email.com",
  "password": "secreto123"
}
```

**Response exitosa:**
```json
{
  "token": "eyJ0eXAiOiJKV1Q...",
  "user_email": "maria@email.com",
  "user_nicename": "maria",
  "user_display_name": "Maria Perez"
}
```

**Response error:**
```json
{
  "code": "[jwt_auth] incorrect_password",
  "message": "<strong>Error</strong>: Contrasena incorrecta.",
  "data": { "status": 403 }
}
```

### 2.2 Validar Token

#### POST /jwt-auth/v1/token/validate

**Headers:**
```
Authorization: Bearer eyJ0eXAiOiJKV1Q...
```

**Response exitosa:**
```json
{
  "code": "jwt_auth_valid_token",
  "data": { "status": 200 }
}
```

### 2.3 Usuario Actual

#### GET /wp/v2/users/me

**Headers:**
```
Authorization: Bearer eyJ0eXAiOiJKV1Q...
```

**Response:**
```json
{
  "id": 45,
  "name": "Maria Perez",
  "slug": "maria-perez",
  "email": "maria@email.com",
  "registered_date": "2025-01-15T08:00:00+00:00"
}
```

---

## 3. FLAI - Sistema de Inventario

**Base URL:** `https://cel.flai.com.do`
**Estado:** BYPASSED (FLAI_BYPASS = true)
**Cliente:** `src/api/flai.js`

---

### 3.1 Autenticacion FLAI

#### POST /api/exo/auth/sign_in/

**Request Body:**
```json
{
  "login": "aromadelrosal",
  "password": "aroma*27"
}
```

**Response:** Cookie de sesion en headers (Set-Cookie)

### 3.2 Verificar Disponibilidad

#### POST /api/products/availability/

**Headers:** Cookie de sesion FLAI

**Request Body:**
```json
{
  "products": [
    { "sku": "SKU-001", "quantity": 2 }
  ]
}
```

**Response:**
```json
{
  "available": true,
  "products": [
    { "sku": "SKU-001", "quantity": 2, "available": true }
  ]
}
```

### 3.3 Crear Reservacion

#### POST /api/cart/products/user/

**Headers:** Cookie de sesion FLAI

**Request Body:**
```json
{
  "products": [
    { "sku": "SKU-001", "quantity": 2 }
  ]
}
```

**Response:**
```json
{
  "reservation_id": "RES-12345",
  "status": "reserved"
}
```

---

## Notas Importantes

1. **Timeout global**: 15 segundos para todas las llamadas API
2. **Reintentos**: No hay logica de reintentos automaticos
3. **Cache**: No hay capa de cache - todas las llamadas van directo al servidor
4. **Paginacion**: WooCommerce usa headers `X-WP-Total` y `X-WP-TotalPages` para paginacion
5. **Rate Limiting**: WooCommerce no tiene rate limiting configurado (depende del servidor)
6. **Errores**: Los errores de WooCommerce vienen en formato `{ code, message, data: { status } }`
