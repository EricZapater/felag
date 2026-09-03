# QA — Mòdul Viatges (`trips`) — Fase 2

**Veredicte**: **APTE**  
**Data**: 2026-09-03  
**Auditor**: Agent QA  

---

## 🧪 Resum de l'Execució de Proves

| Capa | Comanda / Validació | Resultat | Detall |
| :--- | :--- | :--- | :--- |
| **Backend** | `go test -v ./...` a `backend/` | **PASS (100%)** | `TestCreateTripValidation`, `TestGetTripPrivacy`, `TestUpdateTrip` superats amb èxit. |
| **Frontend Web** | `pnpm --filter frontend typecheck` | **PASS (0 errors)** | Verificació de tipus TypeScript estricta sobre Vite + React + MUI. |
| **Mobile App** | `pnpm --filter mobile typecheck` | **PASS (0 errors)** | Verificació de tipus TypeScript estricta sobre Expo + React Native Paper. |
| **Contracte OpenAPI** | Validació `contracts/trips.openapi.yaml` | **COMPLERT** | Rutes `/api/v1/trips` i `/api/v1/trips/{trip_id}` (GET, POST, PUT, DELETE) 100% fidels. |
| **Base de Dades** | Migració SQL `000002_create_trips_table` | **COMPLERT** | Taules `trips` i `trip_stages` amb FKs, índexs i eliminació en cascada (`ON DELETE CASCADE`). |

---

## 📋 Matriu de Traçabilitat d'Històries d'Usuari

| ID Història | Nom | Criteris d'Acceptació Verificats | Estat |
| :--- | :--- | :--- | :--- |
| **HU-TRIP-01** | Creació d'un Viatge | Validació de títol no buit, dates globals (`end >= start`), mínim 1 etapa, visibilitat per defecte `public`, retorn `201 Created`. | **PASS** |
| **HU-TRIP-02** | Itinerari Multietapa | Suport per a múltiples etapes ordenades (`stage_order`), comprovació que les dates de cada etapa estan incloses dins el rang global del viatge. | **PASS** |
| **HU-TRIP-03** | Llistat dels Meus Viatges | Endpoint `GET /api/v1/trips` protegit per JWT, filtratge temporal per paràmetre `?filter=all\|upcoming\|past`, resum de destinacions. | **PASS** |
| **HU-TRIP-04** | Consulta de Detall | Endpoint `GET /api/v1/trips/:id`, array d'etapes ordenades per `stage_order`, protecció de privacitat per a viatges privats d'altres usuaris (`404 Not Found`). | **PASS** |
| **HU-TRIP-05** | Edició i Sincronització | Endpoint `PUT /api/v1/trips/:id`, verificació d'autoria de l'usuari autenticat, actualització atòmica de viatge i etapes mitjançant transacció SQL. | **PASS** |
| **HU-TRIP-06** | Eliminació de Viatge | Endpoint `DELETE /api/v1/trips/:id`, només el propietari pot eliminar, eliminació en cascada de `trip_stages`, retorn `204 No Content`. | **PASS** |
| **HU-TRIP-07** | Ajustos de Privacitat | Suport complet dels valors d'enum `public`, `contacts_only` i `private` tant al backend com a la interfície web i mòbil. | **PASS** |

---

## 🔍 Proves Funcionals i de Seguretat

1. **Creació de viatge multietapa (`POST /api/v1/trips`)**:
   - Creació satisfactòria de viatges amb múltiples etapes (destinació, país ISO, dates d'estada i notes).
   - Rebuig amb `400 Bad Request` en cas de:
     - Títol buit o absent.
     - Data d'inici posterior a data de fi.
     - Llista d'etapes buida.
     - Dates d'etapa que excedeixen el rang de dates global del viatge.
     - Data d'inici d'etapa posterior a data de fi d'etapa.

2. **Llistat i filtratge (`GET /api/v1/trips`)**:
   - Filtratge per `upcoming` (viatges amb data de fi superior o igual a la data actual).
   - Filtratge per `past` (viatges amb data de fi anterior a la data actual).
   - Filtratge `all` / per defecte (tots els viatges de l'usuari autenticat).

3. **Control d'accés i privacitat (`GET /api/v1/trips/:id`)**:
   - Els usuaris poden accedir als seus propis viatges sense importar la visibilitat.
   - Els viatges amb visibilitat `public` o `contacts_only` són accessibles pels altres usuaris.
   - Els viatges `private` d'altres usuaris retornen `404 Not Found` per evitar filtració d'existència.

4. **Modificació i persistència atòmica (`PUT /api/v1/trips/:id`)**:
   - Actualització parcial o total de metadades del viatge.
   - Reemplaçament sincronitzat d'etapes executat dins de transacció `BEGIN ... COMMIT` amb `ROLLBACK` en cas d'error.

5. **Eliminació i integritat referencial (`DELETE /api/v1/trips/:id`)**:
   - Eliminació permesa únicament al propietari (`user_id`).
   - La clau forana `ON DELETE CASCADE` garanteix la neteja automàtica a `trip_stages`.

---

## 📐 Qualitat de Codi i Arquitectura

- **Backend Go**:
  - Compliment estricte del patró per capes (`handler -> service -> repository`).
  - Ús de SQL pur amb paràmetres posicionals (`$1, $2, ...`) prevenint injeccions SQL.
  - Ús de transaccions `tx` per a operacions compostes (viatge + etapes).
  - Middleware JWT i gestió estandarditzada d'errors amb codis `INVALID_INPUT`, `NOT_FOUND`, `UNAUTHORIZED`.

- **Frontend Web & Mobile**:
  - Stores d'estat aïllats amb Zustand (`useTripsStore`).
  - Tipatge TypeScript coherent i derivat del contracte OpenAPI.
  - Validació de formularis tant a client com a servidor.
  - Vistes completes de llistat, detall amb etapes i formulari de creació/edició multietapa.

---

## 🏁 Veredicte Final

El mòdul de Viatges (**`trips`**) de la **Fase 2** compleix amb tots els requisits d'especificació, contractes d'API, tests unitaris, coherència de tipus i estàndards de qualitat del projecte FELAG.

**VEREDICTE: APTE ✅**
