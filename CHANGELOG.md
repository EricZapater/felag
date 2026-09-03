# Changelog — FELAG

Tots els canvis rellevants d'aquest projecte seran documentats en aquest fitxer.
El format està basat en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
i aquest projecte adhereix a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-03

### Added
- **Fase 3 — FELAG Matching & Notificacions Push**:
  - **Motor de Matching per Esdeveniments (Event-Driven)**: Worker asíncron en segon pla que calcula solapament de dates i jerarquia d'afinitats d'origen (Poble 🥇, Regió 🥈, País 🥉) sense frenar la creació de viatges.
  - **Notificacions Push (Expo Push Notifications)**: Registre automàtic de tokens de dispositiu mòbil i enviament de push en temps real a través de l'API d'Expo quan es detecta un nou FELAGI coincident.
  - **Safata de Notificacions In-App**: Suport per a marcatge de lectura individual i global a web i mòbil.
  - **Frontend Web (React + MUI)**: Vista de coincidències per viatge ([TripMatchesView.tsx](file:///Users/eric.zapater/Developer/felag/frontend/src/modules/matching/views/TripMatchesView.tsx)), safata de notificacions ([NotificationsView.tsx](file:///Users/eric.zapater/Developer/felag/frontend/src/modules/notifications/views/NotificationsView.tsx)) i barra de navegació unificada amb badge de notificacions pendents.
  - **App Mòbil (Expo + React Native Paper)**: Pantalla de coincidències ([TripMatchesScreen.tsx](file:///Users/eric.zapater/Developer/felag/mobile/src/modules/matching/screens/TripMatchesScreen.tsx)), safata d'avisos ([NotificationsScreen.tsx](file:///Users/eric.zapater/Developer/felag/mobile/src/modules/notifications/screens/NotificationsScreen.tsx)) i integració de la pestanya Avisos (🔔) amb recompte dinàmic.
  - **Base de dades**: Migració `000003_create_matching_and_notifications.up.sql` amb taules `matches`, `user_push_tokens` i `notifications`.
  - **Informes**: Validació de qualitat a [qa-reports/matching.md](file:///Users/eric.zapater/Developer/felag/qa-reports/matching.md) (APTE) i d'experiència d'usuari a [ux-reports/matching.md](file:///Users/eric.zapater/Developer/felag/ux-reports/matching.md) (APTE).

## [0.2.0] - 2026-09-03

### Added
- **Fase 2 — Viatges (`trips`)**:
  - Model de dades i migració SQL per a viatges multietapa (`000002_create_trips_table.up.sql`).
  - Backend Go: Endpoints CRUD de viatges amb validació de dates i tests unitaris.
  - Frontend Web (React + MUI) i App Mòbil (Expo + React Native Paper): Vistes de llistat, creació multietapa i detall d'itinerari amb colors terra.
  - Informes: QA (APTE) i UX (APTE).

## [0.1.0] - 2026-09-03

### Added
- **Fase 0 — Fundació**: Estructura del monorepo amb workspace pnpm (`frontend` + `mobile`), Go backend amb Gin, React frontend, i Expo mòbil.
- **Fase 1 — Autenticació (`auth`) & Perfil (`profile`)**:
  - Registre, login JWT, jerarquia d'orígens precarregats (País → Regió → Ciutat), telèfon MFA i suport Cloudflare R2.
