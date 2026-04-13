# Reglas de Negocio — Aroma del Rosal
> Última actualización: 2026-04-13
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
- **BLOCKED:** Flag admin via meta `ud_is_deactivated='1'`. Prioridad maxima, bloquea compras. No es estado de transicion.
- **INACTIVE:** Reemplaza PENALIZED conceptualmente para rolling window. Meta `_kit_last_active_purchase_ts` (unix ts) controla el window de 3 meses. Se evalua via resolveRestrictionState().
- **Razón:** Modelo comercial Mary Kay con penalizaciones y recompensas trimestrales
- **Desde:** 2026-03-31 (BLOCKED+INACTIVE agregados 2026-04-10)

### RULE-003: Mínimos de Carrito por Estado
- **Descripción:** NEW: Kit (ID 4994) + RD$20,000. ACTIVE: RD$1,000 (solo productos seccion 2 / con descuento). PENALIZED: RD$20,000. INACTIVE: RD$20,000 (reactivacion). DISABLED: no puede comprar. BLOCKED: no puede comprar (flag admin, maxima prioridad). Admin: sin minimo.
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

### RULE-006: Evaluacion de Inactividad Rolling (antes: Penalizacion Trimestral)
- **Descripción:** Si una consultora ACTIVE no registra una compra calificada (>= RD$20,000) en los ultimos 3 meses rolling desde `_kit_last_active_purchase_ts`, pasa a INACTIVE. Ya no se usan trimestres calendario fijos (Ene-Mar, etc.). Se evalua via `resolveRestrictionState()` al login.
- **Razón:** Regla operativa Mary Kay para mantener consultoras activas. Rolling window es mas justo que trimestres fijos.
- **Nota:** PENALIZED sigue existiendo como estado legacy en la maquina de estados pero INACTIVE es el mecanismo activo para nuevas evaluaciones.
- **Desde:** 2026-03-31 (rolling window activo desde 2026-04-10)

### RULE-008: Bloqueo por Flag Admin
- **Descripción:** Si el meta de WordPress `ud_is_deactivated` = '1' en el usuario, la consultora queda en estado BLOCKED. Tiene prioridad maxima sobre cualquier otro estado. La consultora ve una pantalla de bloqueo y no puede operar la app (ni navegar, ni agregar al carrito, ni hacer checkout).
- **Fuente:** Plugin WordPress user-deactivator. El flag se activa/desactiva manualmente por un admin.
- **Evaluacion:** `resolveRestrictionState()` revisa este flag antes de cualquier otra condicion.
- **Razón:** Control administrativo para casos de fraude, deuda u otras situaciones que requieran suspension inmediata.
- **Desde:** 2026-04-10

### RULE-009: Reactivacion desde INACTIVE (compra unica de 20k)
- **Descripción:** Una consultora en estado INACTIVE debe realizar una compra minima de RD$20,000 para reactivarse. Esta regla aplica UNICAMENTE a la primera compra mientras permanezca inactiva. Una vez la compra sea aprobada/completada y la flag cambie a ACTIVE, las compras posteriores vuelven al minimo estandar de RD$1,000.
- **Flujo completo:**
  1. Estado INACTIVE → checkout exige 20,000 minimo
  2. Compra >= 20,000 se aprueba
  3. `handleOrderSuccess` llama `getTransitionAfterPurchase('inactive', total, ...)` → retorna 'active'
  4. `buildMetaUpdatesForTransition('active', { fromInactive: true })` actualiza en WooCommerce: `consultant_state='active'`, `_kit_last_active_purchase_ts=<now>`, `_kit_activa_confirmada='1'`
  5. `refreshUserData` reconstruye user → `restrictionState = null` → minimo vuelve a 1,000
  6. Siguientes compras usan regla ACTIVE normal (1,000)
- **Garantias:** La validacion de 20,000 NO se repite despues de reactivacion. `resolveRestrictionState` confia en state INACTIVE directamente (no re-valida). Despues de transicion, `shouldMarkInactive(<fresh_ts>)` retorna false.
- **Razón:** Permite reactivacion organica sin intervencion de soporte, a diferencia de DISABLED.
- **Desde:** 2026-04-10 (flujo completo verificado 2026-04-13)

### RULE-007: Seccion 2 = Productos con Descuento
- **Descripción:** "Seccion 2" se refiere a productos que tienen algun tipo de descuento aplicado (esNeto !== true). "Seccion 1" son productos a precio neto (0% descuento). El minimo de RD$1,000 para ACTIVE solo cuenta productos de seccion 2.
- **Razón:** Clasificacion comercial interna de Mary Kay
- **Desde:** 2026-03-31
