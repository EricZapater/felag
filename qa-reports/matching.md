# QA — Mòdul Matching & Notificacions Push (`matching`) — Fase 3

**Veredicte**: **APTE**  
**Data**: 2026-09-03  
**Auditor**: Agent QA  

---

## 🧪 Resum de l'Execució de Proves

| Capa | Comanda / Validació | Resultat | Detall |
| :--- | :--- | :--- | :--- |
| **Backend Tests** | `go test -v ./...` a `backend/` | **PASS (100%)** | `TestCalculateAffinity` (town, region, country, no-affinity), `TestCalculateMatchesForTrip`, `TestMatchingWorkerEventProcessing`, `TestRegisterAndUnregisterToken`, `TestSendPushNotification`, `TestNotificationsReadStatus`. |
| **Frontend Web** | `pnpm --filter frontend typecheck` | **PASS (0 errors)** | Verificació de tipus TypeScript estricta sobre Vite + React + MUI (`tsc --noEmit`). |
| **Mobile App** | `pnpm --filter mobile typecheck` | **PASS (0 errors)** | Verificació de tipus TypeScript estricta sobre Expo + React Native Paper (`tsc --noEmit`). |
| **Contracte OpenAPI** | Validació `contracts/matching.openapi.yaml` | **COMPLERT** | Endpoints `/api/v1/trips/{trip_id}/matches`, `/api/v1/matches/{match_id}`, `/api/v1/notifications/push-token`, `/api/v1/notifications`, `/api/v1/notifications/{id}/read` i `/api/v1/notifications/read-all` 100% conformes. |
| **Base de Dades** | Migració `000003_create_matching_and_notifications` | **COMPLERT** | Taules `matches`, `user_push_tokens`, `notifications` amb FKs, índexs de cerca temporal i territorial, i constrenyiments d'unicitat. |

---

## 📋 Matriu de Traçabilitat d'Històries d'Usuari

| ID Història | Nom | Criteris d'Acceptació Verificats | Estat |
| :--- | :--- | :--- | :--- |
| **HU-MATCH-01** | Càlcul de Solapament de Dates i Destinació | Càlcul precís de la finestra d'intersecció temporal (`overlap_start_date` = `max(s1, s2)`, `overlap_end_date` = `min(e1, e2)`). Exclusió automàtica de viatges privats (`visibility == 'private'`) i exclusió d'automatching (`owner != candidate`). | **PASS** |
| **HU-MATCH-02** | Jerarquia d'Afinitat d'Origen i Explicació | Càlcul jeràrquic d'afinitats: Poble (`town`, score 100), Regió (`region`, score 75), País (`country`, score 50). Generació d'explicacions contextualitzades en català (ex: *"Tots dos sou de Vic (Catalunya)!"*). | **PASS** |
| **HU-MATCH-03** | Processament Asíncron per Esdeveniments | Arquitectura desacoblada amb worker asíncron (`MatchingWorker`) i canals Go (`chan shared.TripEvent`). La creació o actualització d'un viatge respon de forma immediata per HTTP sense bloqueig. | **PASS** |
| **HU-MATCH-04** | Registre de Token Push de l'App Mòbil | Endpoints `POST` i `DELETE` a `/api/v1/notifications/push-token`. Suport de dispositius `ios`, `android` i `web`. Upsert atòmic per `token` associat a l'usuari autenticat. | **PASS** |
| **HU-MATCH-05** | Enviament de Notificacions Push en Temps Real | Client d'integració amb l'API d'Expo Push (`https://exp.host/--/api/v2/push/send`). Enviament automàtic simètric als usuaris afectats en detectar un nou match, amb deep links i metadades (`match_id`, `trip_id`). | **PASS** |
| **HU-MATCH-06** | Consulta de Coincidències per Viatge | Endpoints `GET /api/v1/trips/:trip_id/matches` (ordenat per `affinity_score DESC`) i `GET /api/v1/matches/:match_id` amb informació de perfil (`FelagiUser`), orígens, dates i afinitat. | **PASS** |
| **HU-MATCH-07** | Safata de Notificacions In-App | Endpoints `GET /api/v1/notifications`, `PUT /api/v1/notifications/:id/read` i `PUT /api/v1/notifications/read-all`. Persistència i actualització d'estat de lectura. | **PASS** |

---

## 🔍 Detall de les Proves Específiques

### 1. Motor de Matching (`felag/backend/internal/matching`)
- **`TestCalculateAffinity`**:
  - `Same_Town_Match`: Verifica nivell `town`, puntuació `100` i explicació *"Tots dos sou de Vic (Osona)!"*.
  - `Same_Region_Match`: Verifica nivell `region`, puntuació `75` i explicació *"Tots dos sou de Catalunya!"*.
  - `Same_Country_Match`: Verifica nivell `country`, puntuació `50` i explicació *"Tots dos sou de Catalunya!"*.
  - `Different_Countries_(No_Affinity)`: Verifica que orígens diferents no generen coincidència (`level == ""`, score `0`).
- **`TestCalculateMatchesForTrip`**:
  - Verifica la detecció creuada de candidats, la persistència simètrica dels registres de match (usuari A ↔ usuari B) i el càlcul d'interseccions temporals (`2026-10-11` a `2026-10-15`).
- **`TestMatchingWorkerEventProcessing`**:
  - Comprova el cicle de vida del worker asíncron (`Start()`, recepció d'esdeveniments via `eventsChan`, càlcul en background i `Stop()`).

### 2. Notificacions Push & In-App (`felag/backend/internal/notification`)
- **`TestRegisterAndUnregisterToken`**:
  - Registre de tokens Expo (`ExponentPushToken[test-token-123]`) per dispositiu (`ios`).
  - Validació d'eliminació de token en tancar sessió.
- **`TestSendPushNotification`**:
  - Creació de notificació a la safata in-app amb estat no llegit (`read = false`).
  - Enviament de payload HTTP a l'endpoint mock d'Expo Push amb headers correctes (`Content-Type`, `Accept`).
- **`TestNotificationsReadStatus`**:
  - Lectura individual (`MarkAsRead`) i lectura massiva (`MarkAllAsRead`).

---

## 📐 Qualitat de Codi i Arquitectura

- **Backend Go**:
  - Arquitectura neta amb segregació de responsabilitats (`handler -> service -> repository -> worker`).
  - Worker desacoblat mitjançant esdeveniments de domini compartits (`shared.TripEvent`).
  - Transaccions segures a nivell de base de dades amb clàusula `ON CONFLICT (trip_id, matched_trip_id) DO UPDATE`.
  - Tractament transparent i no bloquejant dels errors en l'enviament de push a tercers (Expo API).

- **Frontend Web & Mobile App**:
  - Mòduls `matching` i `notifications` complets amb gestió d'estat aïllada mitjançant Zustand (`useMatchingStore`, `useNotificationsStore`).
  - Pantalles de llistat de coincidències (`TripMatchesScreen`, `TripMatchesView`), targetes de FELAGI amb insígnia d'afinitat (`AffinityBadge`) i centre de notificacions.
  - Zero errors de TypeScript en tot el monorepositori.

---

## 🏁 Veredicte Final

El mòdul de Coincidències i Notificacions Push (**`matching`**) de la **Fase 3** compleix amb la totalitat dels requisits d'especificació, el contracte OpenAPI 3.0, la suite de tests unitaris i d'integració, i les garanties de tipus de la plataforma FELAG.

**VEREDICTE: APTE ✅**
