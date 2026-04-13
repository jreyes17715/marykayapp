# Log de Ejecución — Implementador
> Escribir una entrada después de CADA implementación.
> Este log se consolida semanalmente para extraer patrones nuevos.

## 2026-04-13 — Fix 3 persistent bugs: kit state, INACTIVE min, blocked login
- Tarea: Corregir 3 bugs persistentes: (1) estado kit se invierte post-compra, (2) usuario INACTIVE ve minimo 1k en vez de 20k, (3) usuario bloqueado ve texto crudo 'is_deactived' al login
- Resultado: aprobado (reviewer: approve with changes — T004 match broadened)
- Tiempo: ~20 minutos
- Commits: 687adc7, 21788e5, 2dddd6f, faf9942, 2f92cf7 (5 commits, 4 archivos)
- Aprendizaje:
  - resolveRestrictionState no debe re-validar estados ya determinados: si consultantState es INACTIVE, confiarlo directamente
  - hasBoughtKit es flag monotónico: una vez true, nunca debe revertir a false. refreshUserData debe preservarlo
  - ProfileScreen necesita caso para CADA estado posible, no asumir que else cubre todo
  - Errores de plugins WP pueden ser strings arbitrarios — usar substring match amplio ('deactiv') no exacto
  - loadUserFromToken quedo como dead code tras refactor de refreshUserData (low priority cleanup)

## 2026-04-11 — Bugfix batch: 10 critical bugs (7 commits)
- Tarea: Auditar y corregir 10 bugs criticos: persistencia carrito, kit auto-add, billing perdido, falso error carrito, timeout orden, kit flag, badge notificaciones, BlockedScreen UX, validacion INACTIVE, kit state flip
- Resultado: aprobado (reviewer: approve with changes, H1+H2+M4 corregidos)
- Tiempo: ~45 minutos
- Aprendizaje:
  - clearCart siempre debe ir DESPUES de setSuccess para evitar wipe en error intermedio
  - Pre-cargar refs de producto (kit) al montar evita race conditions en addToCart
  - useFocusEffect con navigation.goBack() destruye form state — usar Alert con boton
  - updateCustomer fire-and-forget + refreshUserData inmediato = race condition clasica — usar .finally()
  - shouldMarkInactive debe aplicarse sincrónicamente en buildUserFromToken, no solo en background
  - evaluateQuarterlyStatus debe re-correr resolveRestrictionState para no pisar BLOCKED
  - Linking.openURL('mailto:') necesita .catch() fallback en dispositivos sin email client

## 2026-04-11 — CartContext: fix race condition en kit auto-inject
- Tarea: Agregar useEffect de pre-carga del kit product al montar CartProvider, para que kitProductRef.current siempre este poblado cuando addToCart se ejecute por primera vez, evitando la rama async que causa falsos errores de carrito invalido en CheckoutScreen.
- Resultado: aprobado
- Tiempo: ~2 minutos
- Aprendizaje: El useEffect vacio ([]) se coloca justo despues del restore effect (linea 165) y antes del persist effect (linea 176). No necesita depender de user porque KIT_PRODUCT_ID es constante y getProductById no requiere autenticacion. Bug 1 (clearCart post-checkout) pertenece a CheckoutScreen T003 — no se toco CartContext para ese caso.

## 2026-04-10 — AuthContext: soporte BLOCKED + INACTIVE en restriction states
- Tarea: Agregar resolveRestrictionState/shouldMarkInactive/getUserMeta desde consultantState.js; nuevos campos isDeactivated, lastActivePurchaseTs, isBlocked, restrictionState en buildUserFromToken; reemplazar penalizacion trimestral con inactivity rolling check; extender evaluateQuarterlyStatus a INACTIVE; NO rechazar BLOCKED en login
- Resultado: aprobado
- Tiempo: ~10 minutos
- Aprendizaje: AuthContext importaba getUserMeta de helpers.js; al migrar a consultantState.js la funcion es identica en firma pero vive en el modulo correcto. getPreviousQuarterBounds/shouldPenalize quedaron sin uso tras el reemplazo del bloque de penalizacion — se removieron para mantener imports limpios.

## 2026-03-31 — AuthContext: estados de consultora y evaluacion trimestral
- Tarea: Modificar AuthContext.js para integrar consultant_state, isDisabled, rewardAvailable/rewardRedeemed, bloqueo de DISABLED en login, y evaluacion trimestral en background
- Resultado: aprobado
- Tiempo: ~15 minutos
- Aprendizaje: CONSULTANT_STATES se exporta desde cartRules.js (no desde consultantState.js). buildUserFromToken ya era funcion async en scope de modulo, por lo que el auto-login useEffect pudo llamarla directamente sin necesidad de loadUserFromToken. evaluateQuarterlyStatus no tiene dependencias de estado externas por lo que useCallback(fn, []) es correcto.

## 2026-03-31 — CartContext: premio por rewardAvailable y kit auto-inject para NEW

- Tarea: Modificar CartContext.js — 8 cambios: nuevo import KIT_PRODUCT_ID, kitProductRef, useEffect premio basado en user.rewardAvailable/rewardRedeemed, addToCart con auto-inject del kit para NEW, removeFromCart/decrementQuantity/updateQuantity bloqueando remocion del kit para NEW
- Resultado: aprobado
- Tiempo: ~10 minutos
- Aprendizaje: PREMIO_THRESHOLD ya no se usa en CartContext (sigue exportado en cartRules por compatibilidad). La logica del kit en addToCart esta dentro del setter de setCartItems (closure), por lo que user?.consultantState debe estar en el array de dependencias del useCallback para evitar stale closure. kitProductRef se declara junto a premioProductRef despues de los memos totalSinPremio/hasPremio.

## 2026-03-31 — Utils / cartValidation: reescritura basada en estados formales
- Tarea: Reescribir src/utils/cartValidation.js para usar getConsultantState/getMinimumForState en lugar de logica legacy con diasDesdeUltimaCompra/necesitaReactivacion. Eliminadas funciones obsoletas. Agregada calcularTotalSeccion2. Actualizados validarCarrito y getValidationMessage con tipos: disabled, missing_kit, new_customer, active, penalized.
- Resultado: aprobado
- Tiempo: ~10 minutos
- Aprendizaje: El import de getConsultantState/getMinimumForState viene de '../utils/consultantState' (mismo directorio, ruta relativa valida). calcularTotalSeccion2 depende de calcularPrecioFinal para detectar productos netos. MIN_AMOUNT_NEW, MIN_AMOUNT_ACTIVE, MIN_AMOUNT_PENALIZED ya no se importan directamente en cartValidation — se obtienen via getMinimumForState para centralizar la logica.

## 2026-03-31 — LoginScreen / AppNavigator: eliminar flujo de registro

- Tarea: 3 cambios — (1) agregar Alert a imports y detectar ACCOUNT_DISABLED en handleLogin con Alert.alert en catch; (2) eliminar TouchableOpacity de registro y sus estilos registerLinkWrap/registerLinkText de LoginScreen; (3) eliminar import de RegisterScreen y su AuthStack.Screen de AppNavigator; (4) eliminar archivo RegisterScreen.js
- Resultado: aprobado
- Tiempo: ~5 minutos
- Aprendizaje: Alert no estaba en los imports de react-native en LoginScreen — siempre verificar imports antes de usar APIs de RN. La deteccion ACCOUNT_DISABLED usa comparacion exacta de string e?.message === 'ACCOUNT_DISABLED', que debe coincidir con lo que lanza AuthContext.

## 2026-03-31 — Order tracking dinamico con notas WooCommerce
- Tarea: Agregar getOrderNotes() a woocommerce.js, parsear timestamps de cambios de estado desde notas del sistema, mostrar timestamps en timeline y seccion de notas al cliente en OrderTrackingScreen
- Resultado: aprobado
- Tiempo: ~15 minutos
- Aprendizaje: WooCommerce order notes pueden estar en ingles ("Order status changed from X to Y") o espanol ("Estado del pedido cambiado de X a Y") segun config del sitio. Se necesitan ambos regex. El status "Pending payment" en notas mapea a slug "pending" (no "pending-payment"). Para el estado initial "pending" no hay nota de cambio — usar order.date_created como fallback.

## 2026-03-31 — Tests: actualizar suite para maquina de estados
- Tarea: Reescribir 4 archivos de test rotos por la migracion al sistema de estados (NEW/ACTIVE/PENALIZED/DISABLED). Archivos: __tests__/discounts.test.js (agregar assertions nivel), __tests__/cartRules.test.js (imports + constantes nuevas), __tests__/cartValidation.test.js (reescritura completa), src/utils/__tests__/cartValidation.test.js (reescritura completa).
- Resultado: aprobado — 147/147 tests pasan
- Tiempo: ~20 minutos
- Aprendizaje: Existia un archivo duplicado en src/utils/__tests__/cartValidation.test.js que tambien usaba la API legacy — siempre buscar tests en multiples ubicaciones. Para NEW y ACTIVE, validarCarrito calcula totales INTERNAMENTE desde cartItems via calcularPrecioFinal (el param totalConDescuento NO se usa). Solo PENALIZED usa totalConDescuento. Los items de test necesitan regular_price/price/meta_data completos para que calcularPrecioFinal funcione correctamente. Con descuento default 50%, regular_price '40000' => precioFinal 20000.

## 2026-03-31 — Utils / consultantState
- Tarea: Crear src/utils/consultantState.js con 11 funciones puras para el sistema de estados de consultora
- Resultado: aprobado
- Tiempo: ~10 minutos
- Aprendizaje: cartRules.js ya tenia todas las constantes necesarias. MIN_AMOUNT_NEW es 20000 (no 25000 como indica RULE-002 del shared business-rules — el valor en codigo es la fuente de verdad). El archivo no requiere React ni AsyncStorage, es logica de dominio pura reutilizable por cualquier capa.

## 2026-04-10 — Constants y state machine: BLOCKED + INACTIVE
- Tarea: Agregar BLOCKED e INACTIVE a CONSULTANT_STATES en cartRules.js; agregar MIN_AMOUNT_INACTIVE=20000 e INACTIVE_GRACE_MONTHS=3; agregar getUserMeta, isBlocked, isInactive, resolveRestrictionState, shouldMarkInactive a consultantState.js; actualizar getTransitionAfterPurchase, buildMetaUpdatesForTransition (extras.fromInactive) y getMinimumForState para los nuevos estados.
- Resultado: aprobado
- Tiempo: ~10 minutos
- Aprendizaje: isInactive necesita llamar a getConsultantState internamente para el caso legacy (sin timestamp pero con estado INACTIVE guardado). El diff de meses PHP (truncar a primer dia del mes, luego year*12+month) se replica fielmente con new Date(year, month, 1) en JS — sin riesgo de timezone drift. buildMetaUpdatesForTransition usa flag extras.fromInactive en lugar de detectar el estado previo, para mantener la firma de la funcion backward-compatible.

## 2026-04-10 — BlockedScreen: pantalla de bloqueo de cuenta
- Tarea: Crear src/screens/BlockedScreen.js — pantalla full-screen para consultoras con flag ud_is_deactivated. Icono Feather lock (size 80), titulo, mensaje, boton WhatsApp soporte, boton cerrar sesion.
- Resultado: aprobado
- Tiempo: ~5 minutos
- Aprendizaje: El proyecto usa Feather (no Ionicons) de @expo/vector-icons. El icono equivalente a lock-closed de Ionicons es "lock" en Feather. Verificar siempre el patron de iconos existente antes de importar una libreria diferente.

## 2026-04-10 — CartScreen: banner informativo para estado INACTIVE
- Tarea: Agregar banner amarillo en CartScreen que se muestra cuando user.restrictionState === 'inactive', indicando el minimo de RD$20,000 para reactivar la cuenta.
- Resultado: aprobado
- Tiempo: ~5 minutos
- Aprendizaje: useAuth y user ya estaban importados/desestructurados en CartScreen — no fue necesario ningun import adicional. El banner se coloca despues del validationBanner y antes del FlatList, lo que garantiza visibilidad sin afectar el scroll de items.

## 2026-04-10 — cartValidation + CheckoutScreen: restriccion INACTIVE/BLOCKED
- Tarea: (1) Agregar MIN_AMOUNT_INACTIVE a imports de cartValidation.js; (2) agregar check user.restrictionState === INACTIVE en getMinRequiredForUser con prioridad sobre estado base; (3) agregar checks BLOCKED e INACTIVE al inicio de validarCarrito usando restrictionState; (4) agregar casos 'blocked' e 'inactive' en getValidationMessage; (5) importar CONSULTANT_STATES en CheckoutScreen; (6) agregar bloque de reactivacion INACTIVE en handleOrderSuccess que llama getTransitionAfterPurchase(INACTIVE,...) y buildMetaUpdatesForTransition con extras.fromInactive = true.
- Resultado: aprobado
- Tiempo: ~10 minutos
- Aprendizaje: El campo restrictionState ('blocked'|'inactive'|null) es independiente de consultantState. Siempre se evalua ANTES del estado base en validarCarrito. La reactivacion INACTIVE en checkout es un segundo intento de transicion: si el primer getTransitionAfterPurchase(user.consultantState,...) retorna null (porque consultantState puede ser 'active' para usuarios con restriction), se intenta explicitamente con CONSULTANT_STATES.INACTIVE como estado. buildMetaUpdatesForTransition con fromInactive:true escribe _kit_last_active_purchase_ts reiniciando el rolling window.

## 2026-04-11 — BlockedScreen: reemplazar WhatsApp por email de soporte
- Tarea: Cambiar handleContactarSoporte de wa.me a mailto:atencionalcliente@aromadelrosal.com; actualizar texto del mensaje para mostrar el email visible; actualizar texto del boton a "Enviar Correo a Soporte".
- Resultado: aprobado
- Tiempo: ~2 minutos
- Aprendizaje: Bug 8B — enlace WhatsApp hardcodeado no era el canal de soporte correcto. mailto: es el canal oficial.

## 2026-04-06 — AZUL Payment Page integration (pago con tarjeta)
- Tarea: Integrar AZUL Payment Page como metodo de pago alternativo a transferencia bancaria. Crear src/api/azul.js (hash SHA512, UTF-16LE, build params, validate response), src/components/AzulPaymentWebView.js (WebView embebido con form POST auto-submit, intercepta callbacks), actualizar CheckoutScreen con selector de metodo de pago y flujo AZUL via Modal.
- Resultado: aprobado (post-review con fixes aplicados)
- Tiempo: ~30 minutos
- Aprendizaje: expo-crypto digest() retorna ArrayBuffer, necesita conversion manual a hex string. AZUL Payment Page es redirect-based (no API directa) — el patron estandar mobile es WebView embebido. El hash de AZUL usa concatenacion de campos + AuthKey → UTF-16LE → SHA-512 (siguiendo patron del plugin oficial WooCommerce). formatAmount debe usar toFixed(2).replace('.','') en vez de Math.round(*100) para evitar drift IEEE-754. El WebView onNavigationStateChange puede disparar multiples veces para la misma URL — usar useRef como guard. originWhitelist=['*'] es inseguro, usar ['https://*','about:blank']. Siempre resetear refs de control (submittingRef) en todos los callbacks de salida del flujo async.
