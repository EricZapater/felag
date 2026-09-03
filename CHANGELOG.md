# Changelog — FELAG

Tots els canvis rellevants d'aquest projecte seran documentats en aquest fitxer.
El format està basat en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
i aquest projecte adhereix a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-09-03

### Added
- **Fase 6 — Post-Trip Experience: Celebration, Feedback & Exploration**:
  - **Hub de Viatge Actiu («El meu viatge en curs»)**: Panell interactiu integrat al llistat i detall de viatges per accedir ràpidament a la Celebration Card, l'Àlbum de fotos, el Feed en viu i la gestió de privadesa.
  - **Àlbum / Galeria de Fotos del Viatge (`trip_photos`)**: Emmagatzematge a Cloudflare R2 de records fotogràfics del viatge amb selecció de fotos destacades (⭐) que alimenten automàticament el reportatge final.
  - **Celebration Card («Ens hem trobat! 📸»)**: Generador de targetes commemoratives oficials (*"L'Èric (Terrassa) i el Marc (Sabadell) s'han trobat a Tòquio! 🗼✨"*) en qualsevol moment del viatge, amb enviament directe com a missatge al xat i descàrrega en PNG.
  - **Ritual de Tancament del Viatge**: Activació automàtica el dia final (`end_date <= NOW()`) amb checklist de 3 tasques, valoració per estrelles (1-5 ⭐) i publicació de consells comunitaris directes a la guia de destinació.
  - **Reportatge Instagram Stories en format 9:16 (1080x1920)**: Targeta vertical amb estadístiques clau (dies, etapes, FELAGIS connectats), mosaic fotogràfic 2x2 i botó de descàrrega / integració amb Web Share API (Web) i React Native Share (Mòbil).
  - **Exploració Global de Destinacions**: Motor de recomanacions de viatge basat en afinitat d'origen territorial (*"Popular entre FELAGIS de la teva terra"*).
  - **Base de dades**: Migració `000007_create_post_trip_and_celebration.up.sql` amb taules `trip_photos`, `celebration_cards`, `trip_feedback` i `wrapup_tasks_status`.
  - **Informes**: Validació de qualitat a [qa-reports/post-trip.md](file:///Users/eric.zapater/Developer/felag/qa-reports/post-trip.md) (APTE) i d'experiència d'usuari a [ux-reports/post-trip.md](file:///Users/eric.zapater/Developer/felag/ux-reports/post-trip.md) (APTE).

## [0.5.0] - 2026-09-03

### Added
- **Fase 5 — Community Knowledge & Real-Time Moments**:
  - Pàgines de Destinació Geogràfiques (>150k ciutats) amb banners dinàmics comunitaris.
  - Recomanacions categoritzades (🍽️, 💎, 🚆, 💡, 📖), vots útils 👍 i comentaris.
  - Pop-up modal d'arribada amb 3 nivells de privadesa i feed efímer de fotos en directe.
  - Autocomplete predictiu de ciutats a viatges (`DestinationAutocomplete` / `DestinationPickerModal`).

## [0.4.0] - 2026-09-03

### Added
- **Fase 4 — FELAG Connect (Xat xifrat AES-256-GCM, WebSockets, Perfils Públics i Moderació)**.

## [0.3.0] - 2026-09-03

### Added
- **Fase 3 — FELAG Matching & Notificacions Push (Event-Driven)**.

## [0.2.0] - 2026-09-03

### Added
- **Fase 2 — Viatges (`trips`) multietapa**.

## [0.1.0] - 2026-09-03

### Added
- **Fase 0 — Fundació** i **Fase 1 — Identitat & Orígens**.
