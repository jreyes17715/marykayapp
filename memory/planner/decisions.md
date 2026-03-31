# Decisiones Arquitectónicas
> Leído por el PLANNER antes de crear planes. Actualizado después de cada decisión.
> Formato: Fecha, decisión, alternativas evaluadas, razón, resultado.

## 2026-03-31 — Sistema de Estados de Consultora (State Machine)
- **Decisión:** Implementar 4 estados formales (NEW, ACTIVE, PENALIZED, DISABLED) como meta de WooCommerce en lugar del sistema implicito anterior (hasBoughtKit + diasDesdeUltimaCompra).
- **Alternativas:** (1) Mantener sistema implicito y agregar flags — descartado por complejidad creciente. (2) Backend intermedio — descartado por restriccion de Fase 1.
- **Razón:** El PRD exige transiciones explicitas, evaluacion trimestral, y bloqueo de cuentas. El sistema implicito no podia modelar penalizacion ni inhabilitacion.
- **Resultado:** Logica centralizada en src/utils/consultantState.js (funciones puras), evaluacion trimestral al login en AuthContext, transiciones post-compra en CheckoutScreen.

## 2026-03-31 — Evaluacion trimestral al login
- **Decisión:** Evaluar penalizacion y elegibilidad de reward al momento del login (no en cron ni en backend).
- **Alternativas:** (1) Cron job en WordPress — no disponible en Fase 1. (2) Evaluar en cada visita al carrito — overhead innecesario.
- **Razón:** Sin backend intermedio, el unico momento confiable para evaluar es cuando la consultora se autentica.
- **Resultado:** evaluateQuarterlyStatus() en AuthContext se ejecuta post-login para ACTIVE users.

## 2026-03-31 — Eliminacion de RegisterScreen
- **Decisión:** Remover el registro de usuarios de la app.
- **Razón:** Las consultoras se crean por proceso interno de Mary Kay, no por auto-registro. El PRD lo excluye explicitamente.
- **Resultado:** RegisterScreen eliminado, ruta removida de AppNavigator, link removido de LoginScreen.
