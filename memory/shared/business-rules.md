# Reglas de Negocio — Aroma del Rosal
> Última actualización: 2026-03-25
> Este archivo es leído por TODOS los agentes antes de cada tarea.
> Agregar reglas aquí cuando se descubran o se definan.

## Reglas Activas

### RULE-001: Descuentos por Nivel
- **Descripción:** Los descuentos se calculan en src/utils/discounts.js con prioridad: Override manual > Nivel ORO (50%) > Base (50%) > Producto específico > Precio neto (0%)
- **Razón:** Modelo de negocio Mary Kay con niveles de consultora
- **Excepciones:** Precio neto = 0% descuento siempre
- **Desde:** 2026-03-25

### RULE-002: Estados de Consultora (State Machine)
- **Descripción:** 4 estados formales: NEW, ACTIVE, PENALIZED, DISABLED. Almacenados en meta `consultant_state` de WooCommerce. Logica en src/utils/consultantState.js.
- **Transiciones:** NEW→ACTIVE (kit+20k), ACTIVE→PENALIZED (trimestre <20k), PENALIZED→ACTIVE (compra 20k+), NEW→DISABLED (nunca compro), DISABLED→ACTIVE (6 meses + 20k o override soporte)
- **Razón:** Modelo comercial Mary Kay con penalizaciones y recompensas trimestrales
- **Desde:** 2026-03-31

### RULE-003: Mínimos de Carrito por Estado
- **Descripción:** NEW: Kit (ID 4994) + RD$20,000. ACTIVE: RD$1,000 (solo productos seccion 2 / con descuento). PENALIZED: RD$20,000. DISABLED: no puede comprar. Admin: sin minimo.
- **Razón:** Políticas comerciales Mary Kay RD
- **Excepciones:** Admin y Staff no tienen mínimo. Envio no cuenta para minimos.
- **Desde:** 2026-03-31

### RULE-004: Producto Kit Obligatorio
- **Descripción:** Producto Kit ID 4994 es obligatorio para consultoras NEW. Se auto-inyecta en el carrito y no se puede eliminar.
- **Razón:** Requisito de onboarding Mary Kay
- **Desde:** 2026-03-25

### RULE-005: Producto Premio (Reward Trimestral)
- **Descripción:** Producto Premio ID 6694 se entrega UNA sola vez cuando la consultora acumula RD$60,000 en un trimestre calendario. Se agrega automaticamente en la siguiente compra. Controlado por meta `reward_available` y `reward_redeemed`.
- **Razón:** Incentivo por ventas trimestrales. Solo se agrega como regalo, no se vende.
- **Desde:** 2026-03-31

### RULE-006: Penalizacion Trimestral
- **Descripción:** Si en un bloque de 3 meses calendario (Ene-Mar, Abr-Jun, Jul-Sep, Oct-Dic) una consultora ACTIVE no acumula RD$20,000, pasa a PENALIZED. Se evalua al login.
- **Razón:** Regla operativa Mary Kay para mantener consultoras activas
- **Desde:** 2026-03-31

### RULE-007: Seccion 2 = Productos con Descuento
- **Descripción:** "Seccion 2" se refiere a productos que tienen algun tipo de descuento aplicado (esNeto !== true). "Seccion 1" son productos a precio neto (0% descuento). El minimo de RD$1,000 para ACTIVE solo cuenta productos de seccion 2.
- **Razón:** Clasificacion comercial interna de Mary Kay
- **Desde:** 2026-03-31
