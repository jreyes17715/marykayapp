# Patrones Aprobados — Implementador
> LEE ESTE ARCHIVO ANTES DE IMPLEMENTAR CUALQUIER TAREA.
> Cada patrón fue validado por el reviewer. Seguirlos reduce rechazos a ~0%.
> Última actualización: 2026-03-25

## Patrón: JavaScript Puro (NO TypeScript)
- **Contexto:** Todo el proyecto
- **Regla:**
  SIEMPRE:
  - Usar archivos .js
  - Componentes funcionales con hooks
  NUNCA:
  - Usar TypeScript (.ts, .tsx)
  - Usar componentes de clase

## Patrón: Estado Global via Context
- **Contexto:** Manejo de estado compartido
- **Regla:**
  SIEMPRE:
  - Usar React Context (AuthContext, CartContext)
  - Persistir con AsyncStorage donde aplique
  NUNCA:
  - Instalar Redux, Zustand, MobX u otro state manager

## Patrón: Estilos con StyleSheet
- **Contexto:** Estilos de componentes
- **Regla:**
  SIEMPRE:
  - Usar StyleSheet.create() al final de cada archivo
  - Usar colores del tema definidos en CLAUDE.md
  NUNCA:
  - Usar styled-components, Tailwind, o estilos inline extensos

## Patrón: UI en Español
- **Contexto:** Todo texto visible al usuario
- **Regla:**
  SIEMPRE:
  - Texto de UI en español
  - Moneda en RD$ (Pesos Dominicanos)
  NUNCA:
  - Mostrar texto en inglés al usuario final

## Patrón: Funciones Puras de Dominio en src/utils/
- **Contexto:** Logica de negocio sin dependencias de React o red
- **Regla:**
  SIEMPRE:
  - Importar constantes desde src/constants/ (no hardcodear valores)
  - Usar new Set(Object.values(ENUM)) para validar valores de enum
  - Para fechas: new Date(year, month, day, h, m, s, ms) para evitar timezone drift
  - Retornar null (no lanzar) cuando una operacion no aplica (ej. DISABLED sin minimo)
  NUNCA:
  - Importar React, hooks o AsyncStorage en archivos de utils puros
  - Duplicar constantes que ya existen en cartRules.js
