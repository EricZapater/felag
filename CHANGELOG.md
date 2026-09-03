# Changelog — FELAG

Tots els canvis rellevants d'aquest projecte seran documentats en aquest fitxer.
El format està basat en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
i aquest projecte adhereix a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-03

### Added
- **Fase 2 — Viatges (`trips`)**:
  - **Model de dades i migració SQL**: Taules `trips` i `trip_stages` amb suport per a viatges multietapa, índexs i eliminació en cascada (`000002_create_trips_table.up.sql`).
  - **Backend Go**: Endpoints complets a `internal/trip/` (`GET /api/v1/trips`, `POST /api/v1/trips`, `GET /api/v1/trips/:id`, `PUT /api/v1/trips/:id`, `DELETE /api/v1/trips/:id`) amb validació de dates i tests unitaris.
  - **Frontend Web (React + MUI)**: Vistes de Llistat de viatges amb filtres (`TripsListView.tsx`), Creació dinàmica d'etapes (`TripCreateView.tsx`) i Detall amb línia de temps (*timeline*) (`TripDetailView.tsx`).
  - **App Mòbil (Expo + React Native Paper)**: Pantalles de llistat, formulari de viatge i detall amb navegació per pestanyes inferiors (Bottom Tabs) i colors terra.
  - **Informes**: Validació de qualitat i experiència d'usuari a [qa-reports/trips.md](file:///Users/eric.zapater/Developer/felag/qa-reports/trips.md) (APTE) i [ux-reports/trips.md](file:///Users/eric.zapater/Developer/felag/ux-reports/trips.md) (APTE).

## [0.1.0] - 2026-09-03

### Added
- **Fase 0 — Fundació**: Estructura del monorepo amb workspace pnpm (`frontend` + `mobile`), Go 1.22 backend amb Gin, React + Vite frontend, i Expo + React Native Paper mòbil.
- **Fase 1 — Autenticació (`auth`)**:
  - Endpoint de registre, login amb JWT (Access Token + Refresh Token), refresh de token, logout i `/me`.
  - Pantalles visuals de Login i Registre a la web i l'app mòbil amb paleta de colors terra.
- **Fase 1 — Perfil i Orígens (`profile`)**:
  - Jerarquia d'orígens precarregada (País → Regió → Ciutat) sense permís d'entrada lliure.
  - Emmagatzematge de foto de perfil compatible amb Cloudflare R2.
  - Camp de telèfon integrat per a verificació multifactor (MFA).
  - Vistes de consulta, edició de perfil i selector d'origen en 3 passes a la web i mòbil.
