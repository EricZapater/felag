# QA — Mòdul Community Knowledge & Real-Time Moments (`community`) — Fase 5

**Veredicte**: **APTE**  
**Data**: 2026-09-03  
**Auditor**: Agent QA  

---

## 🧪 Resum de l'Execució de Proves i Validacions Tècniques

| Capa / Comanda | Resultat | Detall d'Execució |
| :--- | :--- | :--- |
| **Backend Go Unit Tests**<br>`go test -count=1 -v ./...` a `backend/` | **PASS (100%)** | Tots els paquets superats (`community`, `chat`, `matching`, `moderation`, `notification`, `profile`, `shared`, `trip`).<br>Tests específics de community: `TestCommunityService_SearchAndDetail`, `TestCommunityService_RecommendationsAndVotes`, `TestCommunityService_Comments`, `TestCommunityService_LiveFeed_AccessControl`, `TestCommunityService_Reports`. |
| **Typecheck Monorepo**<br>`pnpm typecheck` | **PASS (0 errors)** | Verificació estricta TypeScript a `frontend` (React + MUI) i `mobile` (React Native + Expo + Paper). |
| **Mobile Bundle Check**<br>`pnpm build:mobile:check` | **PASS (0 errors)** | Pre-build bundle check amb Metro Bundler sobre target Android exportat satisfactòriament. |
| **Contracte OpenAPI**<br>`contracts/community.openapi.yaml` | **COMPLERT** | Endpoints de destinacions, recomanacions, vots, comentaris, live feed, privadesa i denúncies 100% conformes a l'especificació OpenAPI 3.0.3. |
| **Base de Dades & Migracions**<br>`000006_create_community_and_moments` | **COMPLERT** | Taules `recommendations`, `recommendation_votes`, `recommendation_comments`, `live_moments`, `community_reports` i columna `photo_sharing_mode` a `trips` amb FKs i índexs eficients. |

---

## 📋 Matriu de Traçabilitat d'Històries d'Usuari (`specs/community.md`)

| ID Història | Nom de la Història | Criteris d'Acceptació i Contracte OpenAPI | Estat |
| :--- | :--- | :--- | :--- |
| **HU-COMM-01** | Pàgines de Destinació Geogràfica | `GET /api/v1/destinations` (cerca autocompletable) i `GET /api/v1/destinations/:id` (resolució per `town_id` o `country_code`, comptadors de visitants, FELAGIS actius i recomanacions). | **PASS** |
| **HU-COMM-02** | Recomanacions Categoritzades | 5 categories suportades (`food`, `hidden_gem`, `transport`, `practical_tip`, `anecdote`), títol (màx. 120), descripció (màx. 2.000), foto R2 opcional i orígens de l'autor. `GET/POST /api/v1/destinations/:id/recommendations`. | **PASS** |
| **HU-COMM-03** | Vots d'Utilitat i Comentaris | Toggle de vot d'utilitat (`POST /api/v1/recommendations/:id/vote`, màx. 1 vot per usuari) i fils de comentaris (`GET/POST /api/v1/recommendations/:id/comments`). | **PASS** |
| **HU-COMM-04** | Pop-up d'Arribada & Privadesa Live Feed | Pop-up modal actiu a l'arribada amb 3 opcions (`all_felagis`, `close_origin`, `none`). Actualització via `PUT /api/v1/trips/:id/photo-sharing`. Feed efímer amb control d'accés per viatge actiu via `GET/POST /api/v1/destinations/:id/live-feed`. | **PASS** |
| **HU-COMM-05** | Filtres per Afinitat d'Origen | Filtratge de recomanacions per `origin_filter` (`all`, `same_origin`, `same_town`) prioritzant consells de viatgers del mateix territori/poble. | **PASS** |
| **HU-COMM-06** | Moderació Comunitària | Endpoint de denúncia `POST /api/v1/community/report` amb motius `spam`, `inappropriate_content`, `false_information`, `harassment`, `other` per a recomanacions, comentaris o live moments. | **PASS** |
| **HU-COMM-07** | Selector Predictiu a Viatges | Component `DestinationAutocomplete` (Web) i `DestinationPickerModal` (Mòbil) connectats a la BD geogràfica, desant `town_id`, `region_id`, `country_code` a `trip_stages` i navegant a la fitxa de destinació. | **PASS** |

---

## 🔍 Detall de les Verificacions Tècniques

### 1. Backend (`backend/internal/community`)
- **Control d'accés al Live Feed**: La capa de servei valida si l'usuari disposa d'un viatge actiu en les dates actuals que coincideixi amb la ciutat o país sol·licitat abans de permetre veure o publicar fotos (`403 ErrNoActiveTrip`).
- **Idempotència i integritat de vots**: El mètode `ToggleVote` gestiona de manera atòmica la inserció o retirada del vot i recalcula el total de vots útils.
- **Resolució polimòrfica de destinacions**: El mètode `ResolveDestination` distingeix correctament identificadors numèrics/UUID de pobles (`town_id`) de codis ISO de 2 caràcters de països (`country_code`).

### 2. Frontend Web (`frontend/src/modules/community` & `trips`)
- **`ArrivalPromptDialog`**: Modal interactiu de benvinguda amb il·lustracions clares, selector de 3 opcions de privadesa i confirmació asíncrona.
- **`DestinationDetailView` & `DestinationsListView`**: Vistes completes amb fitxa de destinació, pestanyes de categories, selector d'afinitat d'origen, llistat de recomanacions amb vots útils i desplegament de comentaris.
- **`LiveFeedView`**: Galeria fotogràfica efímera amb restricció visual per a usuaris sense viatge en curs.
- **`DestinationAutocomplete`**: Selector asíncron amb cerca predictiva i vinculació a la base geogràfica normalitzada per a `TripCreateView`.

### 3. Mobile App (`mobile/src/modules/community` & `trips`)
- **`ArrivalPromptModal`**: Bottom sheet nadiu en React Native Paper amb selector d'opcions de privadesa de compartició de fotos.
- **`DestinationDetailScreen` & `DestinationsListScreen`**: Navegació fluida amb filtres per categories (Xips), vots interactius i feed en viu.
- **`RecommendationCreateScreen` & `LiveFeedScreen`**: Formularis de creació amb gestió d'imatges i vista de moments efímers.
- **`DestinationPickerModal`**: Modal de cerca i selecció de ciutats i països integrat al flux de creació d'etapes de viatge.

---

## 🏁 Veredicte Final

Tots els requisits funcionals de la **Fase 5 (Community Knowledge & Real-Time Moments)** han estat validats de manera exhaustiva. Els tests unitaris del backend, la verificació de tipus TypeScript a tot el monorepo i el build check del paquet mòbil han passat amb un 100% d'èxit sense cap error.

**VEREDICTE: APTE ✅**
