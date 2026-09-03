# Changelog — FELAG

Tots els canvis rellevants d'aquest projecte seran documentats en aquest fitxer.
El format està basat en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
i aquest projecte adhereix a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-09-03

### Added
- **Fase 5 — Community Knowledge & Real-Time Moments**:
  - **Pàgines de Destinació Geogràfiques**: Guies completes per ciutat i país connectades a la base de dades geogràfica (>150k ciutats) amb estadístiques de viatgers i comptadors de FELAGIS presents.
  - **Recomanacions i Consells Categoritzats**: Publicació de consells classificats en 5 categories (🍽️ Gastronomia, 💎 Racó secret, 🚆 Transport & mobilitat, 💡 Consells pràctics, 📖 Anècdotes locals) amb suport per a fotos R2 i ubicacions.
  - **Vots d'Utilitat & Comentaris**: Sistema de vots *"👍 Útil"* per destacar els millors consells i fils de discussió per interactuar amb els autors.
  - **Filtres per Afinitat d'Origen**: Filtre *"De la meva terra"* per prioritzar recomanacions de viatgers amb el mateix poble, comarca o regió.
  - **Notificació Pop-up d'Arribada & Selector de Privadesa**: Pop-up automàtic en començar el viatge amb 3 nivells de privadesa (🌍 *Amb tots els FELAGIS*, 🏡 *Només amb els meus propers*, 🔒 *Mode Privat*).
  - **Feed Efímer de Fotos en Directe**: Galeria viva d'imatges compartides en temps real exclusiva per a usuaris presents a la mateixa destinació en dates solapades.
  - **Selector Predictiu de Destinacions a Viatges**: Integració del component `DestinationAutocomplete` a Web i `DestinationPickerModal` a Mòbil per assignar canònicament `town_id` a les etapes dels viatges (`trip_stages`).
  - **Moderació Comunitària**: Endpoints i diàlegs de denúncia de contingut inapropiat o spam.
  - **Base de dades**: Migració `000006_create_community_and_moments.up.sql` amb taules `destination_recommendations`, `recommendation_votes`, `recommendation_comments`, `destination_live_moments` i `community_reports`.
  - **Informes**: Validació de qualitat a [qa-reports/community.md](file:///Users/eric.zapater/Developer/felag/qa-reports/community.md) (APTE) i d'experiència d'usuari a [ux-reports/community.md](file:///Users/eric.zapater/Developer/felag/ux-reports/community.md) (APTE).

## [0.4.0] - 2026-09-03

### Added
- **Fase 4 — FELAG Connect (Xat xifrat, WebSockets, Perfils Públics i Moderació)**:
  - Xifrat en repòs AES-256-GCM a la base de dades amb IV aleatori i clau simètrica.
  - WebSocket Hub bidireccional (`/api/v1/ws/chat`) per a missatgeria instantània.
  - Notificacions push offline via Expo Push API.
  - Perfils públics de FELAGIS i eines de bloqueig i denúncia.

## [0.3.0] - 2026-09-03

### Added
- **Fase 3 — FELAG Matching & Notificacions Push**:
  - Motor de matching per esdeveniments (Event-Driven) amb solapament temporal i afinitats (Poble 🥇, Regió 🥈, País 🥉).
  - Migració geogràfica `000004_populate_geographic_data.up.sql` amb 250 països, 5.308 regions i 152.970 ciutats.

## [0.2.0] - 2026-09-03

### Added
- **Fase 2 — Viatges (`trips`)**:
  - Model de dades i migració SQL per a viatges multietapa (`000002_create_trips_table.up.sql`).

## [0.1.0] - 2026-09-03

### Added
- **Fase 0 — Fundació** i **Fase 1 — Identitat & Orígens**.
