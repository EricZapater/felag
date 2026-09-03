# Changelog — FELAG

Tots els canvis rellevants d'aquest projecte seran documentats en aquest fitxer.
El format està basat en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
i aquest projecte adhereix a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-09-03

### Added
- **Fase 4 — FELAG Connect (Xat xifrat, WebSockets, Perfils Públics i Moderació)**:
  - **Xifrat en repòs AES-256-GCM**: Mòdul criptogràfic a [crypto.go](file:///Users/eric.zapater/Developer/felag/backend/internal/shared/crypto.go) amb IV/nonce aleatori per a cada missatge desat a la taula `messages` i desxifratge transparent en memòria per a usuaris autoritzats.
  - **Missatgeria en Temps Real per WebSocket**: WebSocket Hub bidireccional (`/api/v1/ws/chat`) amb connexions concurrents, heartbeats i difusió instantània.
  - **Notificacions Push Offline**: Enviament automàtic d'avisos push d'Expo quan es rep un missatge de xat i l'app no té túnel WebSocket obert.
  - **Perfil Públic de FELAGI**: Endpoint `GET /api/v1/users/:user_id/public-profile` i vistes dedicades amb nom, avatar, bio, orígens i viatges públics.
  - **Seguretat i Moderació**:
    - Bloqueig d'usuaris (`POST` / `DELETE /api/v1/users/:user_id/block` i `GET /api/v1/users/blocked`) amb tall de comunicacions i ocultació de viatges.
    - Denúncia d'usuaris (`POST /api/v1/users/:user_id/report`) amb motius categoritzats per a traçabilitat policial i moderació de seguretat.
  - **Frontend Web (React + MUI)**: [ConversationsView.tsx](file:///Users/eric.zapater/Developer/felag/frontend/src/modules/chat/views/ConversationsView.tsx), [ChatRoomView.tsx](file:///Users/eric.zapater/Developer/felag/frontend/src/modules/chat/views/ChatRoomView.tsx), [PublicProfileView.tsx](file:///Users/eric.zapater/Developer/felag/frontend/src/modules/users/views/PublicProfileView.tsx) i enllaç de Xats 💬 amb badge de no llegits.
  - **App Mòbil (Expo + React Native Paper)**: [ConversationsScreen.tsx](file:///Users/eric.zapater/Developer/felag/mobile/src/modules/chat/screens/ConversationsScreen.tsx), [ChatRoomScreen.tsx](file:///Users/eric.zapater/Developer/felag/mobile/src/modules/chat/screens/ChatRoomScreen.tsx), [PublicProfileScreen.tsx](file:///Users/eric.zapater/Developer/felag/mobile/src/modules/users/screens/PublicProfileScreen.tsx) i nova pestanya *Xats 💬* a la barra de navegació inferior.
  - **Base de dades**: Migració `000005_create_connect_and_chat.up.sql` amb taules `conversations`, `messages`, `user_blocks` i `user_reports`.
  - **Informes**: Validació de qualitat a [qa-reports/connect.md](file:///Users/eric.zapater/Developer/felag/qa-reports/connect.md) (APTE) i d'experiència d'usuari a [ux-reports/connect.md](file:///Users/eric.zapater/Developer/felag/ux-reports/connect.md) (APTE).

## [0.3.0] - 2026-09-03

### Added
- **Fase 3 — FELAG Matching & Notificacions Push**:
  - Motor de matching per esdeveniments (Event-Driven) en background amb solapament temporal i afinitats (Poble 🥇, Regió 🥈, País 🥉).
  - Registre de tokens push i despatx en temps real via Expo Push API.
  - Vistes de coincidències i safata de notificacions a Web i Mòbil.
  - Migració `000003_create_matching_and_notifications.up.sql`.
  - Migració `000004_populate_geographic_data.up.sql` amb 250 països, 5.308 regions i 152.970 ciutats.

## [0.2.0] - 2026-09-03

### Added
- **Fase 2 — Viatges (`trips`)**:
  - Model de dades i migració SQL per a viatges multietapa (`000002_create_trips_table.up.sql`).
  - Backend Go: Endpoints CRUD de viatges amb validació de dates i tests unitaris.
  - Frontend Web (React + MUI) i App Mòbil (Expo + React Native Paper): Vistes de llistat, creació multietapa i detall d'itinerari amb colors terra.

## [0.1.0] - 2026-09-03

### Added
- **Fase 0 — Fundació**: Estructura del monorepo amb workspace pnpm (`frontend` + `mobile`), Go backend amb Gin, React frontend, i Expo mòbil.
- **Fase 1 — Autenticació (`auth`) & Perfil (`profile`)**:
  - Registre, login JWT, jerarquia d'orígens precarregats (País → Regió → Ciutat), telèfon MFA i suport Cloudflare R2.
