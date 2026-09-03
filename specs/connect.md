# Especificació de Mòdul: FELAG Connect (Xat & Interacció) — Fase 4

Aquest document defineix el model de dades, el sistema de missatgeria en temps real amb **xifrat en repòs AES-256-GCM**, la seguretat i moderació, i els criteris d'acceptació per a la Fase 4.

---

## 🎯 Objectiu del Mòdul
Permetre que els usuaris que han coincidit en un viatge puguin consultar els seus perfils públics, comunicar-se mitjançant un xat 1-a-1 en temps real amb missatges xifrats a la base de dades, rebre notificacions push de nous missatges i disposar de mecanismes de seguretat (bloqueig i denúncia formal amb traçabilitat per a cossos de seguretat).

---

## 🔐 Seguretat i Xifrat (AES-256-GCM)

1. **Xifrat en repòs a la Base de Dades**:
   - Cada missatge de text s'encripta mitjançant **AES-256-GCM** (Galois/Counter Mode) amb un vector d'inicialització (IV/nonce) únic per cada missatge i la clau mestra del servidor `CHAT_ENCRYPTION_KEY`.
   - El camp `messages.content` desa exclusivament el paquet encriptat (format Base64: `nonce || ciphertext || tag`).
   - El servidor només desxifra el contingut en memòria en el moment d'entregar-lo als participants autoritzats de la conversa.
2. **Xifrat en trànsit**:
   - Totes les comunicacions HTTP i WebSocket van protegides sota **TLS 1.3 (HTTPS / WSS)**.
3. **Traçabilitat i Denúncies Legals**:
   - En cas que un usuari denunciï formalment amenaces, assetjament o activitats il·lícites, la plataforma pot desxifrar les evidències del xat associades per posar-les a disposició dels cossos de seguretat i autoritats judicials competents.

---

## 🏗️ Model de Dades de Domini

### 1. Taula `conversations` (Converses)
- `id` (UUID, clau primària)
- `match_id` (UUID, referència opcional a `matches`)
- `participant_1` (UUID, referència a `users`)
- `participant_2` (UUID, referència a `users`)
- `last_message_preview` (TEXT, resum del darrer missatge xifrat)
- `last_message_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- `created_at`, `updated_at`
- *Constraints*: Clau única `UNIQUE(participant_1, participant_2)` per evitar converses duplicades.

### 2. Taula `messages` (Missatges)
- `id` (UUID, clau primària)
- `conversation_id` (UUID, referència a `conversations` ON DELETE CASCADE)
- `sender_id` (UUID, referència a `users`)
- `content` (TEXT NOT NULL, contingut xifrat en AES-256-GCM Base64)
- `read` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW())

### 3. Taula `user_blocks` (Bloquejos)
- `id` (UUID, clau primària)
- `blocker_id` (UUID, referència a `users` ON DELETE CASCADE)
- `blocked_id` (UUID, referència a `users` ON DELETE CASCADE)
- `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- *Constraints*: Clau única `UNIQUE(blocker_id, blocked_id)`.

### 4. Taula `user_reports` (Denúncies / Moderació)
- `id` (UUID, clau primària)
- `reporter_id` (UUID, referència a `users`)
- `reported_id` (UUID, referència a `users`)
- `reason` (VARCHAR(100): `spam`, `harassment`, `inappropriate_content`, `safety_concern`, `other`)
- `details` (TEXT)
- `status` (VARCHAR(50) NOT NULL DEFAULT 'pending': `pending`, `reviewed`, `escalated_to_authorities`, `dismissed`)
- `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW())

---

## 📋 Històries d'Usuari

### HU-CONN-01: Perfil Públic del FELAGI
**Com a** usuari de FELAG,  
**Vull** consultar el perfil d'un viatger coincident amb qui comparteixo destí,  
**Per tal de** conèixer el seu nom, avatar, bio, ciutat d'origen i els viatges públics que té previstos.

**Criteris d'Acceptació**:
- Endpoint `GET /api/v1/users/:user_id/public-profile`.
- Retorna: nom, avatar, biografia, resum del seu poble/regió/país d'origen i llista de viatges públics.
- Mai s'exposen dades sensibles com correu electrònic, telèfon o contrasenya.
- Si l'usuari consultat ha bloquejat el sol·licitant (o a la inversa), retorna error `403 Forbidden` / `404 Not Found`.

---

### HU-CONN-02: Llista de Converses i Inici de Xat
**Com a** usuari,  
**Vull** accedir a la meva safata de missatges i poder iniciar una conversa amb un FELAGI des de la targeta del match,  
**Per tal de** centralitzar totes les meves converses en un sol lloc.

**Criteris d'Acceptació**:
- Endpoint `GET /api/v1/conversations`: Retorna la llista de converses ordenades per `last_message_at DESC` amb recompte de missatges no llegits (`unread_count`) i dades de l'altre participant.
- Endpoint `POST /api/v1/conversations`: Crea o retorna una conversa existent entre dos usuaris (associada opcionalment al `match_id`).

---

### HU-CONN-03: Xat 1-a-1 Xifrat i Missatgeria en Temps Real
**Com a** usuari,  
**Vull** enviar i rebre missatges de text de forma instantània i xifrada,  
**Per tal de** protegir les meves converses privades davant d'intrusions o filtracions de base de dades.

**Criteris d'Acceptació**:
- Endpoint `GET /api/v1/conversations/:id/messages`: Recupera l'historial de missatges desxifrats en memòria per als participants.
- Endpoint `POST /api/v1/conversations/:id/messages`: Envia un missatge nou que es xifra en AES-256-GCM abans de persistir-se.
- Endpoint WebSocket `GET /api/v1/ws/chat`: Connexió bidireccional en temps real per rebre i enviar missatges a l'instant.
- Marcatge automàtic com a llegit en obrir la conversa (`PUT /api/v1/conversations/:id/read`).

---

### HU-CONN-04: Notificacions Push de Nous Missatges
**Com a** usuari amb l'aplicació en segon pla o tancada,  
**Vull** rebre una notificació push immediata al meu mòbil quan rebo un missatge de xat,  
**Per tal de** poder respondre ràpidament.

**Criteris d'Acceptació**:
- Quan s'envia un missatge, si el destinatari no té el canal WebSocket actiu a la conversa, el backend envia una notificació push d'Expo (`https://exp.host/--/api/v2/push/send`).
- Títol: *"{Nom del remitent}"*
- Cos: *"{Contingut del missatge}"*
- Deep link directe cap a la conversa `/chats/:id`.

---

### HU-CONN-05: Bloqueig d'Usuaris
**Com a** usuari,  
**Vull** poder bloquejar qualsevol altre usuari en qualsevol moment,  
**Per tal de** protegir la meva privacitat i evitar contactes no desitjats.

**Criteris d'Acceptació**:
- Endpoint `POST /api/v1/users/:user_id/block`: Bloqueja l'usuari.
- Endpoint `DELETE /api/v1/users/:user_id/block`: Desbloqueja l'usuari.
- Endpoint `GET /api/v1/users/blocked`: Llista d'usuaris bloquejats.
- Quan un usuari està bloquejat:
  - No es poden enviar missatges a la conversa existent (retorna error `403 User Blocked`).
  - No apareixeran nous matches entre ells.
  - Els perfils i viatges queden ocults mútuament.

---

### HU-CONN-06: Denúncia / Report d'Usuaris
**Com a** usuari,  
**Vull** poder denunciar un perfil o conversa si detecto spam, amenaces, assetjament o contingut inapropiat,  
**Per tal de** col·laborar en la seguretat de la comunitat FELAG i disposar de proves traçables.

**Criteris d'Acceptació**:
- Endpoint `POST /api/v1/users/:user_id/report`: Envia una denúncia amb motiu (`reason`) i explicació detallada (`details`).
- Retorna confirmació d'enviament `201 Created`.
- Registra l'estat per a la revisió de seguretat / administració.
