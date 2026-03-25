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

### RULE-002: Mínimos de Carrito
- **Descripción:** Cliente nuevo: Kit (ID 4994) + RD$25,000. Recurrente: RD$10,000. Reactivación (+90 días): RD$20,000. Admin/Staff: sin mínimo.
- **Razón:** Políticas comerciales Mary Kay RD
- **Excepciones:** Admin y Staff no tienen mínimo
- **Desde:** 2026-03-25

### RULE-003: Producto Kit Obligatorio
- **Descripción:** Producto Kit ID 4994 es obligatorio para nuevas consultoras
- **Razón:** Requisito de onboarding Mary Kay
- **Desde:** 2026-03-25

### RULE-004: Producto Premio Oculto
- **Descripción:** Producto Premio ID 6694 debe estar oculto en listados de productos
- **Razón:** Solo se agrega como regalo/premio, no se vende directamente
- **Desde:** 2026-03-25
