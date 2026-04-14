# Reglas de Negocio — Aroma del Rosal
> Última actualización: 2026-04-14
> Este archivo es leído por TODOS los agentes antes de cada tarea.
> Agregar reglas aquí cuando se descubran o se definan.

## Reglas Activas

### RULE-001: Descuentos por Nivel
- **Descripción:** Los descuentos se calculan en src/utils/discounts.js con prioridad: Override manual > Nivel ORO (50%) > Base (50%) > Producto específico > Precio neto (0%)
- **Razón:** Modelo de negocio Mary Kay con niveles de consultora
- **Excepciones:** Precio neto = 0% descuento siempre
- **Desde:** 2026-03-25

### RULE-002: Estados de Consultora (State Machine)
- **Descripción:** 6 estados formales: NEW, ACTIVE, PENALIZED, DISABLED, BLOCKED, INACTIVE. Almacenados en meta `consultant_state` de WooCommerce. Logica en src/utils/consultantState.js.
- **Transiciones:** NEW→ACTIVE (kit+20k), ACTIVE→PENALIZED (trimestre <20k), PENALIZED→ACTIVE (compra 20k+), NEW→DISABLED (nunca compro), DISABLED→ACTIVE (6 meses + 20k o override soporte), ACTIVE→INACTIVE (sin compra calificada en 3 meses rolling), INACTIVE→ACTIVE (compra 20k+)
- **BLOCKED:** Determinado por campo `account_disabled: true` del endpoint GET /wp-json/kit/v1/status/{user_id}. Prioridad maxima, bloquea compras. No es estado de transicion.
- **INACTIVE:** Determinado por campo `needs_reactivation: true` del endpoint GET /wp-json/kit/v1/status/{user_id}. El frontend NO recalcula meses. Se evalua via resolveRestrictionState().
- **Razón:** Modelo comercial Mary Kay con penalizaciones y recompensas trimestrales
- **Desde:** 2026-03-31 (BLOCKED+INACTIVE agregados 2026-04-10)

### RULE-003: Mínimos de Carrito por Estado
- **Descripción:** NEW: Kit (ID 4994) + RD$20,000. ACTIVE: RD$1,000 (solo productos seccion 2 / con descuento). PENALIZED: RD$20,000. INACTIVE: RD$20,000 solo en productos con descuento (seccion 2) para reactivacion. DISABLED: no puede comprar. BLOCKED: no puede comprar (flag admin, maxima prioridad). Admin: sin minimo.
- **Razón:** Políticas comerciales Mary Kay RD
- **Excepciones:** Admin y Staff no tienen mínimo. Envio no cuenta para minimos.
- **Desde:** 2026-03-31 (BLOCKED+INACTIVE agregados 2026-04-10)

### RULE-004: Producto Kit Obligatorio
- **Descripción:** Producto Kit ID 4994 es obligatorio para consultoras NEW. Se auto-inyecta en el carrito y no se puede eliminar.
- **Razón:** Requisito de onboarding Mary Kay
- **Desde:** 2026-03-25

### RULE-005: Producto Premio (Reward Trimestral)
- **Descripción:** Producto Premio ID 6694 se entrega UNA sola vez cuando la consultora acumula RD$60,000 en un trimestre calendario. Se agrega automaticamente en la siguiente compra. Controlado por meta `reward_available` y `reward_redeemed`.
- **Razón:** Incentivo por ventas trimestrales. Solo se agrega como regalo, no se vende.
- **Desde:** 2026-03-31

### RULE-006: Evaluacion de Inactividad via Endpoint
- **Descripción:** La inactividad la determina el endpoint publico `GET /wp-json/kit/v1/status/{user_id}` mediante el campo `needs_reactivation`. El frontend lee este campo y NO recalcula usando meses o historial. `needs_reactivation: true` = INACTIVE, `false` = activa. Las funciones `isInactive()` y `shouldMarkInactive()` fueron eliminadas.
- **Razón:** El backend es la fuente de verdad. Endpoint centralizado reemplaza metas distribuidas.
- **Desde:** 2026-04-14 (migrado de _kit_activa_confirmada a endpoint)

### RULE-008: Bloqueo por Cuenta Inhabilitada
- **Descripción:** Si el endpoint `/kit/v1/status/{user_id}` retorna `account_disabled: true`, la consultora queda en estado BLOCKED. Tiene prioridad maxima sobre cualquier otro estado. La consultora ve BlockedScreen (estilo Mary Kay, rosa #d11e51) con email soporte@aromadelrosal.com.
- **Fuente:** Endpoint publico GET /wp-json/kit/v1/status/{user_id}.
- **Evaluacion:** `resolveRestrictionState()` revisa `user.accountDisabled` antes de cualquier otra condicion.
- **Razón:** Control administrativo para casos de fraude, deuda u otras situaciones que requieran suspension inmediata.
- **Desde:** 2026-04-14 (migrado de ud_is_deactivated a endpoint)

### RULE-009: Reactivacion desde INACTIVE (compra unica de 20k en productos con descuento)
- **Descripción:** Una consultora INACTIVE debe realizar una compra minima de RD$20,000 **solo en productos con descuento (seccion 2)** para reactivarse. Productos a precio neto y envio NO cuentan. Esta regla aplica UNICAMENTE mientras permanezca inactiva. Una vez reactivada, el minimo vuelve a RD$1,000.
- **Flujo completo:**
  1. Estado INACTIVE (determinado por `needs_reactivation: true` del endpoint) → checkout exige 20,000 en seccion 2
  2. `validarCarrito` usa `calcularTotalSeccion2(cartItems, user)` para verificar minimo
  3. Compra >= 20,000 (seccion 2) se aprueba
  4. `handleOrderSuccess` → `buildMetaUpdatesForTransition('active', { fromInactive: true })` → escribe `consultant_state='active'`, `_kit_last_active_purchase_ts=<now>`
  5. `refreshUserData` reconstruye user → endpoint retorna `needs_reactivation=false` → `restrictionState = null` → minimo vuelve a 1,000
- **Garantias:** La validacion de 20,000 NO se repite despues de reactivacion. `resolveRestrictionState` lee `user.needReactivation=false` y no marca INACTIVE.
- **Razón:** Permite reactivacion organica sin intervencion de soporte, a diferencia de DISABLED.
- **Desde:** 2026-04-10 (seccion-2-only fix 2026-04-13, migrado a endpoint 2026-04-14)

### RULE-007: Seccion 2 = Productos con Descuento
- **Descripción:** "Seccion 2" se refiere a productos que tienen algun tipo de descuento aplicado (esNeto !== true). "Seccion 1" son productos a precio neto (0% descuento). El minimo de RD$1,000 para ACTIVE solo cuenta productos de seccion 2.
- **Razón:** Clasificacion comercial interna de Mary Kay
- **Desde:** 2026-03-31
