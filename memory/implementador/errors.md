# Errores Conocidos y Fixes
> LEE ESTE ARCHIVO ANTES DE IMPLEMENTAR. Evita repetir errores.
> Aplica a TODOS los agentes, no solo al implementador.
> Última actualización: 2026-03-25

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
- **Status:** Corregido

## ERROR-002: worklets-core conflicto con reanimated 4.x
- **Síntoma:** Build Android falla por conflicto de paquetes
- **Causa:** react-native-worklets-core conflicta con reanimated 4.x
- **Fix:** Remover worklets-core, agregar babel.config.js apropiado
- **Módulos afectados:** Android build
- **Ocurrencias:** 1 (commit bb7f620)
- **Status:** Corregido
