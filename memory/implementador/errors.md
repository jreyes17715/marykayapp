# Errores Conocidos y Fixes
> LEE ESTE ARCHIVO ANTES DE IMPLEMENTAR. Evita repetir errores.
> Aplica a TODOS los agentes, no solo al implementador.
> Última actualización: 2026-04-14

## ERROR-001: babel-preset-expo no disponible
- **Síntoma:** Build falla buscando babel-preset-expo
- **Causa:** Expo 54 usa expo/internal/babel-preset en vez de babel-preset-expo
- **Fix:** En babel.config.js usar `expo/internal/babel-preset`
- **Módulos afectados:** Build system
- **Ocurrencias:** 1 (commit d717962)
- **Status:** Corregido

## ERROR-003: clearCart antes de setSuccess causa perdida de carrito
- **Síntoma:** Carrito se borra inesperadamente; si error ocurre entre clearCart y setSuccess, carrito perdido
- **Causa:** handleOrderSuccess llamaba clearCart() antes de setSuccess(true)
- **Fix:** Reordenar: setSuccess(true) antes de clearCart()
- **Módulos afectados:** CheckoutScreen.js
- **Ocurrencias:** 1 (commit d337312)
- **Status:** Corregido

## ERROR-004: Kit async race condition en addToCart
- **Síntoma:** Falso error "carrito no válido" / "kit obligatorio" aun con kit presente
- **Causa:** kitProductRef.current era null en primer uso; kit se cargaba async dejando un render sin kit
- **Fix:** Pre-cargar kit product al montar CartProvider via useEffect
- **Módulos afectados:** CartContext.js
- **Ocurrencias:** 1 (commit 91e584a)
- **Status:** Corregido

## ERROR-005: refreshUserData race con updateCustomer
- **Síntoma:** Perfil dice "kit comprado" y luego revierte a "kit pendiente"
- **Causa:** refreshUserData() corria inmediatamente después de updateCustomer fire-and-forget, leyendo meta vieja
- **Fix:** Mover refreshUserData a .finally() de updateCustomer
- **Módulos afectados:** CheckoutScreen.js
- **Ocurrencias:** 1 (commit d337312)
- **Status:** Corregido

## ERROR-006: useFocusEffect destruye billing form
- **Síntoma:** Datos de facturacion se borran al volver a checkout despues de error
- **Causa:** navigation.goBack() en useFocusEffect desmontaba el componente y su estado local
- **Fix:** Mostrar Alert con boton en vez de auto-goBack
- **Módulos afectados:** CheckoutScreen.js
- **Ocurrencias:** 1 (commit d337312)
- **Status:** Corregido

## ERROR-007: INACTIVE user validado con minimo de ACTIVE (1k vs 20k)
- **Síntoma:** Usuario desactivado ve minimo de 1,000 en vez de 20,000
- **Causa:** consultantState meta aun dice 'active'; resolveRestrictionState retorna null
- **Fix:** Pre-aplicar shouldMarkInactive antes de resolveRestrictionState en buildUserFromToken
- **Módulos afectados:** AuthContext.js
- **Ocurrencias:** 1 (commit e02fe78)
- **Status:** Corregido (parcial — ver ERROR-008) — Legacy — funciones eliminadas 2026-04-14, validacion ahora via endpoint

## ERROR-008: resolveRestrictionState re-valida INACTIVE innecesariamente
- **Síntoma:** Usuario con consultantState='inactive' ve minimo 1,000 (ACTIVE) en vez de 20,000
- **Causa:** resolveRestrictionState re-llamaba isInactive() incluso cuando state ya era 'inactive'. Si timestamp edge case causaba false, restrictionState quedaba null
- **Fix:** Confiar en state INACTIVE directamente. Solo llamar isInactive() para ACTIVE.
- **Módulos afectados:** consultantState.js
- **Ocurrencias:** 1 (commit 687adc7)
- **Status:** Corregido — Legacy — funciones eliminadas 2026-04-14, validacion ahora via endpoint

## ERROR-009: hasBoughtKit revierte a false tras refreshUserData
- **Síntoma:** Perfil muestra "kit comprado", usuario compra, perfil cambia a "kit pendiente"
- **Causa:** refreshUserData reemplazaba user completo. Si WooCommerce omitia has_bought_kit meta, parseBool(null)=false
- **Fix:** Hacer hasBoughtKit monotónico en refreshUserData (una vez true, nunca revert). Heal consultantState de NEW a ACTIVE.
- **Módulos afectados:** AuthContext.js
- **Ocurrencias:** 1 (commit 21788e5)
- **Status:** Corregido

## ERROR-010: ProfileScreen no maneja estado INACTIVE
- **Síntoma:** Usuario INACTIVE ve "Cuenta deshabilitada" en vez de "Kit Comprado" + aviso reactivacion
- **Causa:** if-else chain no tenia caso para INACTIVE, caia al else/disabled catch-all
- **Fix:** Agregar caso INACTIVE entre PENALIZED y ACTIVE
- **Módulos afectados:** ProfileScreen.js
- **Ocurrencias:** 1 (commit 2dddd6f)
- **Status:** Corregido

## ERROR-011: Blocked user ve texto crudo 'is_deactived' al login
- **Síntoma:** Usuario bloqueado intenta login y ve texto técnico 'is_deactived'
- **Causa:** Plugin WP user-deactivator retorna 403 con message conteniendo 'deactiv'. LoginScreen no reconocia el error.
- **Fix:** Detectar substring 'deactiv' en errMsg y mostrar Alert de Cuenta Bloqueada con email soporte
- **Módulos afectados:** LoginScreen.js
- **Ocurrencias:** 1 (commit faf9942, fix 2f92cf7)
- **Status:** Corregido — Fix actualizado 2026-04-14: muestra Alert con titulo "Cuenta Inhabilitada" y email soporte@aromadelrosal.com con estilos Mary Kay

## ERROR-002: worklets-core conflicto con reanimated 4.x
- **Síntoma:** Build Android falla por conflicto de paquetes
- **Causa:** react-native-worklets-core conflicta con reanimated 4.x
- **Fix:** Remover worklets-core, agregar babel.config.js apropiado
- **Módulos afectados:** Android build
- **Ocurrencias:** 1 (commit bb7f620)
- **Status:** Corregido
