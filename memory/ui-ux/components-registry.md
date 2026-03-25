# Registro de Componentes — UI-UX
> LEE ANTES DE CREAR UN COMPONENTE. Verifica si ya existe o hay uno similar.
> Última actualización: 2026-03-25

## Design Tokens
### Colores
- Primario: #d11e51 (rosa Mary Kay)
- Fondo: #f8f8f8
- Texto: #1a1a2e
- Texto secundario: #6b7280
- Borde: #e5e7eb
- Éxito: #10b981
- Alerta: #f59e0b
- Error: #ef4444

### Componentes Base
| Componente | Variantes | Usado en | Notas |
|---|---|---|---|
| CategoryGridCard | default, loading (skeleton) | HomeScreen via CategoryGrid | White card, #FDF1F5 icon circle, Feather icon 26pt, borderRadius 12, shadow from theme |
| CategoryGrid | default, loading | HomeScreen | 2-col flexWrap grid, gap 12, resolves Feather icons by slug/name |

## Decisiones de UI

### 2026-03-25 — CategoryGridCard visual direction
- Chosen: Option 1 — white card + light-pink icon circle (#FDF1F5)
- Rejected: Option 2 (pink card) — risks washing out icon; less premium
- Rejected: Option 3 (gradient) — gradient not in token set; adds visual noise
- Border: 1pt warm-pink hairline (#F0E4E9) AND shadow (theme.shadow) — border
  grounds the card at rest; shadow lifts it off the page. Both together read
  premium without being heavy.
- activeOpacity: 0.82 — visible press feedback without full-bleed flash
- Icon size: 26pt inside 60x60 circle — ratio keeps icon breathing room
