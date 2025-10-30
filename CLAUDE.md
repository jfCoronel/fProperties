# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

fProperties is a fluid properties tabular calculator built with React and Vite. It provides thermodynamic property calculations for fluids and humid air using the CoolProp library (v6.4.1) compiled to WebAssembly. The application supports bilingual operation (Spanish/English) and includes psychrometric and diagram visualization capabilities.

## Key Commands

```bash
# Development
npm run dev          # Start Vite dev server (default: http://localhost:5173)

# Build
npm run build        # Build for production (outputs to dist/)

# Quality checks
npm run lint         # Run ESLint on .js and .jsx files
npm run preview      # Preview production build locally
```

## Architecture Overview

### Core Technology Stack
- **UI Framework**: React 18.3 (no React Router - single-page app with state-based navigation)
- **State Management**: @hookstate/core v4.0.1 (reactive state management)
- **Component Library**: Ant Design 5.19 (antd)
- **Charts**: Chart.js 4.4.4 with react-chartjs-2
- **Build Tool**: Vite 5.3
- **Physics Engine**: CoolProp 6.4.1 WebAssembly module ([src/propFluidos/coolprop.js](src/propFluidos/coolprop.js))

### Application Structure

**Main Entry Point**: [src/main.jsx](src/main.jsx) → [src/fProperties.jsx](src/fProperties.jsx)

**State Management** ([src/configuracion.js](src/configuracion.js)):
- Global state managed via @hookstate with `configuracion` object
- Contains UI state, language settings, version info, table configurations, and diagram settings
- `cargarTextosUI()` loads i18n JSON files from `public/json/{idioma}.json`
- `getTextoUI(key)` retrieves localized strings

**Fluid Calculations** ([src/propFluidos/](src/propFluidos/)):
- [fluidos.js](src/propFluidos/fluidos.js): Wraps CoolProp for pure fluid properties
  - `NOMBRES_FLUIDOS`: Spanish-to-English fluid name mapping (130+ fluids)
  - `getPropFluido()`: Calculate any property given two independent properties
  - `getObjetoFluido()`: Returns complete thermodynamic state object
  - Unit conversions: ºC↔K, kPa↔Pa, kJ/kg↔J/kg, reference state adjustments
- [aires.js](src/propFluidos/aires.js): Psychrometric calculations for humid air
  - `getPropAireHumedo()`: Calculate properties using altitude or pressure + 2 properties
  - Altitude-based pressure calculation using standard atmosphere model
- [coolprop.js](src/propFluidos/coolprop.js): 471KB WebAssembly module (do not modify)

**Data Management**:
- [src/listaFluidos.js](src/listaFluidos.js): Hookstate array managing fluid states
  - Operations: `nuevoFluido()`, `borrarFluidos()`, `duplicarFluidos()`, `actualizarFluido()`
- [src/listaAires.js](src/listaAires.js): Hookstate array managing humid air states
  - Similar operations for air properties

**Components** ([src/components/](src/components/)):
- [TablaFluidos.jsx](src/components/TablaFluidos.jsx): Main table for fluid properties with configurable columns
- [TablaAires.jsx](src/components/TablaAires.jsx): Table for humid air properties
- [Diagrama.jsx](src/components/Diagrama.jsx): Thermodynamic diagrams (p-h, T-s, p-T) using Chart.js
- [Psicrometrico.jsx](src/components/Psicrometrico.jsx): Psychrometric chart visualization
- [DialogoFluido.jsx](src/components/DialogoFluido.jsx): Modal for editing fluid state points
- [DialogoAire.jsx](src/components/DialogoAire.jsx): Modal for editing air state points
- [ConfiguracionFluidos.jsx](src/components/ConfiguracionFluidos.jsx): Settings for fluid tables
- [ConfiguracionAires.jsx](src/components/ConfiguracionAires.jsx): Settings for air tables

**Internationalization**:
- [public/json/es.json](public/json/es.json): Spanish UI strings
- [public/json/en.json](public/json/en.json): English UI strings
- Language selector in main UI controls entire application language

### Important Design Patterns

1. **Property Specification Pattern**: All thermodynamic calculations require:
   - Fluid/air identifier
   - Two (fluids) or three (humid air) independent properties
   - Property IDs (e.g., "T", "P", "H", "S", "HR")
   - Corresponding values with implicit units (see `UNIDADES_FLUIDOS` and `UNIDADES_AIRES`)

2. **Unit Conversions**: Internal CoolProp uses SI base units (K, Pa, J/kg), but the application presents user-friendly units (ºC, kPa, kJ/kg). All conversions happen in `cambiarUnidadEntrada*` and `cambiarUnidadSalida*` functions.

3. **Reference State Adjustments**: Enthalpy and entropy have reference state offsets applied for better usability (h=200 kJ/kg, s=1 kJ/(kg·K) at 0ºC saturated liquid when possible).

4. **State Updates**: When modifying fluid/air states, always call `actualizarFluido()` or `actualizarAire()` to recalculate all dependent properties.

5. **Error Handling**: CoolProp errors return NaN. Check for `isNaN()` or `!isFinite()` when validating calculation results.

## Development Notes

- **No TypeScript**: Project uses JavaScript (.js/.jsx) exclusively
- **No test framework**: No test runner configured (consider adding Vitest if needed)
- **Static assets**: Images in [public/img/](public/img/), WebAssembly in [docs/coolprop.wasm](docs/coolprop.wasm)
- **Deployment**: Build outputs to [dist/](dist/), appears to deploy to [docs/](docs/) for GitHub Pages (note CNAME file)
- **CoolProp module**: The coolprop.js file is 471KB and should not be read or modified unless absolutely necessary

## Common Development Patterns

**Adding a new fluid property to tables**:
1. Add property key to `PROPIEDADES_FLUIDOS` and `UNIDADES_FLUIDOS` in [src/propFluidos/fluidos.js](src/propFluidos/fluidos.js)
2. Update `getPropFluido()` if special calculation needed
3. Add to `getObjetoFluido()` to include in state objects
4. Add translation keys to [public/json/es.json](public/json/es.json) and [public/json/en.json](public/json/en.json)
5. Update `ConfiguracionFluidos.jsx` column selector options

**Adding a new diagram type**:
1. Add type identifier to `tipoDiagrama` in [src/configuracion.js](src/configuracion.js)
2. Implement axis calculations and chart rendering in [src/components/Diagrama.jsx](src/components/Diagrama.jsx)
3. Add UI selection option in the diagram configuration section

**Adding a new language**:
1. Create `public/json/{code}.json` with all translation keys
2. Add language option to selector in [src/fProperties.jsx](src/fProperties.jsx) line 44-46
3. Update `cargarTextosUI()` if special handling needed
