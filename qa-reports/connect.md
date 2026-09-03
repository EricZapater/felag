# QA — Mòdul FELAG Connect (Xat & Moderació) — Fase 4

**Veredicte**: **APTE**  
**Data**: 2026-09-03  
**Auditor**: Agent QA  

---

## 🧪 Resum de l'Execució de Proves

| Capa | Comanda / Validació | Resultat | Detall |
| :--- | :--- | :--- | :--- |
| **Backend Tests** | `go test -v ./...` a `backend/` | **PASS (100%)** | `TestCrypto_EncryptDecrypt`, `TestCrypto_InvalidCiphertext`, `TestCrypto_DifferentKeys`, `TestChatService_CreateOrGetConversation`, `TestChatService_SendMessage_OfflinePush`, `TestChatService_MarkConversationAsRead`, `TestModerationService_BlockAndIsBlocked`, `TestModerationService_ReportUser`, `TestProfileService_GetPublicProfile`. |
| **Frontend Web** | `pnpm --filter frontend typecheck` | **PASS (0 errors)** | Verificació TypeScript estricta sobre Vite + React + MUI (`tsc --noEmit`). |
| **Mobile App** | `pnpm --filter mobile typecheck` | **PASS (0 errors)** | Verificació TypeScript estricta sobre Expo + React Native Paper (`tsc --noEmit`). |
| **Contracte OpenAPI** | Validació `contracts/connect.openapi.yaml` | **COMPLERT** | Endpoints `/api/v1/users/{user_id}/public-profile`, `/api/v1/conversations`, `/api/v1/conversations/{id}/messages`, `/api/v1/conversations/{id}/read`, `/api/v1/users/{user_id}/block`, `/api/v1/users/blocked`, `/api/v1/users/{user_id}/report` 100% conformes. |
| **Base de Dades** | Migració `000005_create_connect_and_chat` | **COMPLERT** | Taules `conversations`, `messages`, `user_blocks`, `user_reports` amb constrenyiments d'unicitat, claus foranes en cascada i índexs de cerca temporal. |

---

## 📋 Matriu de Traçabilitat d'Històries d'Usuari

| ID Història | Nom | Criteris d'Acceptació Verificats | Estat |
| :--- | :--- | :--- | :--- |
| **HU-CONN-01** | Perfil Públic del FELAGI | Endpoint `GET /api/v1/users/:user_id/public-profile`. Retorna exclusivament nom, avatar, biografia, resum d'origen i viatges públics. Reté la privacitat estricta (sense exposar email ni telèfon). En cas de bloqueig creuat, denega l'accés (`403 Forbidden`). | **PASS** |
| **HU-CONN-02** | Llista de Converses i Inici de Xat | Endpoints `GET /api/v1/conversations` (ordenades per `last_message_at DESC` amb recompte de missatges no llegits `unread_count`) i `POST /api/v1/conversations` (idempotent, crea o recupera conversa existent amb `match_id` opcional i impedeix converses amb un mateix). | **PASS** |
| **HU-CONN-03** | Xat 1-a-1 Xifrat i Temps Real | Endpoints `GET /api/v1/conversations/:id/messages` i `POST /api/v1/conversations/:id/messages`. Xifrat en repòs mitjançant **AES-256-GCM** amb nonce aleatori abans de la persistència SQL. Canal WebSocket `GET /api/v1/ws/chat` per a comunicació bidireccional instantània i marcatge de lectura `PUT /api/v1/conversations/:id/read`. | **PASS** |
| **HU-CONN-04** | Notificacions Push Offline | Si el destinatari no té connexió WebSocket activa en rebre un missatge, el backend despatxa una notificació push d'Expo (`https://exp.host/--/api/v2/push/send`) amb títol del remitent, snippet del missatge i deep link directe a la conversa `/chats/:id`. | **PASS** |
| **HU-CONN-05** | Bloqueig d'Usuaris | Endpoints `POST /api/v1/users/:user_id/block`, `DELETE /api/v1/users/:user_id/block` i `GET /api/v1/users/blocked`. Bloqueig bidireccional immediat: impedeix l'enviament de missatges (`403 User Blocked`), amaga perfils públics i viatges, i descarta nous matches. | **PASS** |
| **HU-CONN-06** | Denúncia / Report de Moderació | Endpoint `POST /api/v1/users/:user_id/report` amb motiu (`spam`, `harassment`, `inappropriate_content`, `safety_concern`, `other`) i descripció detallada (mínim 5 caràcters). Persistència amb traçabilitat per a revisió administrativa i requeriments legals. | **PASS** |

---

## 🔍 Detall de les Proves Específiques i de Seguretat

### 1. Criptografia i Xifrat en Repòs (`felag/backend/internal/shared`)
- **`TestCrypto_EncryptDecrypt`**:
  - Validació de cicle complet d'encriptació i desencriptació amb caràcters ordinaris, espais, caràcters especials, emojis (`🔑🚀✨`) i cadenes buides.
  - Comprovació que el text xifrat en repòs és no nul i completament diferent del text pla.
- **`TestCrypto_InvalidCiphertext`**:
  - Rebuig segur de cadenes Base64 malformades o payloads inferiors a la mida del nonce del vector GCM.
- **`TestCrypto_DifferentKeys`**:
  - Verificació que un missatge xifrat amb una clau no pot ser desxifrat amb una altra clau mestra (autenticació d'etiqueta GCM fallida).

### 2. Motor de Xat i Notificacions (`felag/backend/internal/chat`)
- **`TestChatService_CreateOrGetConversation`**:
  - Prevenció de converses amb un mateix (`ErrSelfConversation`).
  - Bloqueig preventiu de creació de conversa si algun dels participants ha bloquejat l'altre (`ErrForbidden`).
  - Idempotència en la creació i recuperació de converses existents.
- **`TestChatService_SendMessage_OfflinePush`**:
  - Xifrat automàtic del contingut del missatge abans de desar a la base de dades.
  - Emissió en temps real al Hub de WebSockets.
  - Detecció d'usuari fora de línia i disparador automàtic de notificació push d'Expo amb el nom de l'emissor i el resum del missatge.
- **`TestChatService_MarkConversationAsRead`**:
  - Actualització atòmica de l'estat `read = true` per a tots els missatges rebuts a la conversa.
  - Notificació d'esdeveniment `messages_read` a l'altre participant a través de WebSocket.

### 3. Moderació i Seguretat (`felag/backend/internal/moderation`)
- **`TestModerationService_BlockAndIsBlocked`**:
  - Prova d'autobloqueig impedit (`ErrSelfBlock`).
  - Validació de bloqueig bidireccional simètric (`IsBlocked(u1, u2) == true` i `IsBlocked(u2, u1) == true`).
  - Llistat de bloquejats i restabliment correcte en desbloquejar.
- **`TestModerationService_ReportUser`**:
  - Validació de motius de denúncia permesos i longitud mínima de detall.
  - Registre de denúncies amb estat inicial `pending` per a traçabilitat pericial.

### 4. Perfils Públics i Privacitat (`felag/backend/internal/profile`)
- **`TestProfileService_GetPublicProfile`**:
  - Resposta amb dades públiques (nom, avatar, bio, orígens i viatges públics).
  - Ocultació total de dades de contacte sensibles.
  - Retorn de `403 Forbidden` si existeix un bloqueig entre els usuaris.

---

## 📐 Qualitat de Codi i Homogeneïtat

- **Backend Go**:
  - Arquitectura modular neta (`cmd/api/main.go`, `internal/chat`, `internal/moderation`, `internal/profile`, `internal/shared`).
  - Hub WebSocket thread-safe amb mutexos R/W, gestió de canals Go i cicle de vida ping/pong per evitar connexions zombi.
  - Consultes SQL parametritzades amb protecció contra injecció SQL i transaccions per a missatgeria i actualització de resums.
- **Frontend Web & Mobile App**:
  - Mòduls `chat`, `users` i `profile` amb integració de WebSocket automàtica (`wsClient.ts`), reintents de connexió i gestió d'estat reactiva amb Zustand.
  - Vistes completes de llistat de converses, sala de xat 1-a-1 amb bombolles de missatge, hora i tics de lectura, pantalla de perfil públic del FELAGI amb botons d'acció ràpida (iniciar xat, bloquejar i denunciar).
  - Verificació estàtica de tipus (`pnpm typecheck`) superada amb 0 errors tant a web com a mòbil.

---

## 🏁 Veredicte Final

El mòdul **FELAG Connect** (**Fase 4**) compleix estrictament amb totes les especificacions de seguretat, xifrat en repòs AES-256-GCM, comunicació en temps real per WebSockets, integració de notificacions push offline, mecanismes de moderació i bloqueig, i el contracte OpenAPI 3.0.

**VEREDICTE: APTE ✅**
