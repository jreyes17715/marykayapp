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

## ERROR-002: worklets-core conflicto con reanimated 4.x
- **Síntoma:** Build Android falla por conflicto de paquetes
- **Causa:** react-native-worklets-core conflicta con reanimated 4.x
- **Fix:** Remover worklets-core, agregar babel.config.js apropiado
- **Módulos afectados:** Android build
- **Ocurrencias:** 1 (commit bb7f620)
- **Status:** Corregido
