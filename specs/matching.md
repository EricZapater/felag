# Especificació de Mòdul: FELAG Matching & Notificacions Push — Fase 3

Aquest document defineix el model de dades, l'arquitectura dirigida per esdeveniments (*Event-Driven*), el motor de coincidències (*Matching Engine*), el sistema de notificacions push d'Expo i els criteris d'acceptació per a la Fase 3.

---

## 🎯 Objectiu del Mòdul
Detectar automàticament i de forma asíncrona quan usuaris amb orígens comuns (poble, regió o país) coincideixen en una mateixa destinació i interval de dates, notificant-los en temps real mitjançant **Notificacions Push** i mostrant les coincidències ordenades per afinitat.

---

## 🏗️ Arquitectura Tècnica

### 1. Arquitectura Dirigida per Esdeveniments (Event-Driven)
- **Emissió d'esdeveniment**: En crear o actualitzar un viatge (`TripCreatedEvent` / `TripUpdatedEvent`), el servei de viatges publica un esdeveniment al canal intern de missatgeria (Go channels / worker asíncron).
- **Listener / Worker de Matching**:
  1. Rep l'esdeveniment amb les etapes i usuari creador.
  2. Executa la consulta de solapament de dates i destinació contra viatges d'altres usuaris (`visibility != 'private'`).
  3. Calcula el nivell d'afinitat d'origen (Mateix poble > Mateixa regió > Mateix país).
  4. Persisteix les coincidències trobades a la taula `matches`.
  5. Dispara l'esdeveniment `MatchFoundEvent` per a cada usuari afectat.
  6. El servei de notificacions envia la notificació push als dispositius mòbils registrats i crea l'apunt a la safata in-app.

### 2. Notificacions Push (Expo Push Notifications)
- L'app mòbil obté el token d'Expo (`ExponentPushToken[...]`) utilitzant `expo-notifications`.
- L'app registra el token al backend via `POST /api/v1/notifications/push-token`.
- El backend envia les notificacions al servei de missatgeria d'Expo (`https://exp.host/--/api/v2/push/send`) en format JSON amb deep link al detall del match.

---

## 📐 Model de Dades de Domini

### 1. Taula `matches` (Coincidències)
- `id` (UUID, clau primària)
- `trip_id` (UUID, referència al viatge de l'usuari A)
- `matched_trip_id` (UUID, referència al viatge de l'usuari B)
- `user_id` (UUID, usuari A)
- `matched_user_id` (UUID, usuari B)
- `destination_name` (VARCHAR, ciutat on coincideixen)
- `overlap_start_date` (DATE, data d'inici de la coincidència)
- `overlap_end_date` (DATE, data de finalització de la coincidència)
- `affinity_level` (VARCHAR: `town` (poble/ciutat), `region` (regió/comunitat), `country` (país))
- `affinity_score` (INTEGER: 100 per poble, 75 per regió, 50 per país)
- `explanation` (TEXT, ex: *"Tots dos sou d'Osona (Catalunya) i coincidireu a Tòquio"*)
- `status` (VARCHAR: `active`, `dismissed`)
- `created_at`, `updated_at`

### 2. Taula `user_push_tokens` (Dispositius Push)
- `id` (UUID, clau primària)
- `user_id` (UUID, referència a `users`, ON DELETE CASCADE)
- `token` (VARCHAR(512) UNIQUE, `ExponentPushToken[...]`)
- `device_type` (VARCHAR(50): `ios`, `android`, `web`)
- `created_at`, `updated_at`

### 3. Taula `notifications` (Notificacions In-App)
- `id` (UUID, clau primària)
- `user_id` (UUID, referència a `users`)
- `type` (VARCHAR(50): `new_match`, `trip_reminder`, `system`)
- `title` (VARCHAR(255))
- `body` (TEXT)
- `data` (JSONB, inclou `match_id`, `trip_id`, rutes de navegació)
- `read` (BOOLEAN DEFAULT FALSE)
- `created_at`

---

## 📋 Històries d'Usuari

### HU-MATCH-01: Càlcul de Solapament de Dates i Destinació
**Com a** motor de FELAG,  
**Vull** comparar les etapes dels viatges per ciutat i país durant dates coincidents,  
**Per tal de** saber quins usuaris compartiran espai i temps al món.

**Criteris d'Acceptació**:
- Dos viatges coincideixen si:
  - Comparteixen `destination_name` (o codi de país de destinació).
  - Hi ha solapament de dates: `stage_A.start_date <= stage_B.end_date` I `stage_A.end_date >= stage_B.start_date`.
- Només es consideren viatges amb visibilitat `public` (o `contacts_only` si són contactes). Viatges `private` s'exclouen.
- No es fa matching d'un usuari amb ell mateix.

---

### HU-MATCH-02: Jerarquia d'Afinitat d'Origen i Explicació
**Com a** usuari de FELAG,  
**Vull** que les coincidències indiquin clarament el nostre vincle territorial d'origen,  
**Per tal de** donar prioritat a qui és del meu poble o de la meva regió.

**Criteris d'Acceptació**:
- **Poble/Ciutat (`town`)**: Usuaris amb el mateix `town_id`. Score: 100.
  - Explicació: *"Tots dos sou de {town_name} ({region_name})!"*
- **Regió/Comunitat (`region`)**: Usuaris amb pobles diferents però mateix `region_id`. Score: 75.
  - Explicació: *"Tots dos sou de {region_name}!"*
- **País (`country`)**: Usuaris amb regions diferents però mateix `country_id`. Score: 50.
  - Explicació: *"Tots dos sou de {country_name}!"*

---

### HU-MATCH-03: Processament Asíncron per Esdeveniments (Event-Driven)
**Com a** sistema,  
**Vull** que la creació d'un viatge no bloquegi la petició HTTP de l'usuari mentre es calcula el matching,  
**Per tal de** garantir una resposta immediata i processar els càlculs i notificacions en segon pla.

**Criteris d'Acceptació**:
- En respondre `POST /api/v1/trips` o `PUT /api/v1/trips/:id`, s'emet un esdeveniment intern asíncron.
- El listener de matching processa el càlcul sense afectar la latència de la resposta HTTP.

---

### HU-MATCH-04: Registre de Token Push de l'App Mòbil
**Com a** usuari de l'aplicació mòbil,  
**Vull** registrar el meu dispositiu amb el servei de push de FELAG,  
**Per tal de** rebre avisos quan algú de la meva terra viatgi on jo vaig.

**Criteris d'Acceptació**:
- Endpoint `POST /api/v1/notifications/push-token`.
- Emmagatzema o actualitza el `ExponentPushToken[...]` associat a l'usuari autenticat.
- Endpoint `DELETE /api/v1/notifications/push-token` per desregistrar el dispositiu en fer logout.

---

### HU-MATCH-05: Enviament de Notificacions Push en Temps Real
**Com a** usuari que té un viatge planificat,  
**Vull** rebre una notificació push immediata al meu mòbil quan un altre usuari creï un viatge coincident,  
**Per tal de** poder assabentar-me'n a l'instant.

**Criteris d'Acceptació**:
- Quan el worker de matching detecta una nova coincidència, envia una notificació push a tots els dispositius actius dels dos usuaris via Expo Push API.
- Títol: *"✨ Nou FELAGI a {destinació}!"*
- Missatge: *"{Nom} ({origen}) coincidirà amb tu a {destinació} del {data_inici} al {data_fi}."*
- En obrir la notificació, l'app mòbil navega directament a la pantalla del viatge i el seu match.

---

### HU-MATCH-06: Consulta de Coincidències (Matches) per Viatge
**Com a** usuari,  
**Vull** entrar al meu viatge i veure la llista de FELAGIS coincidents ordenats per nivell d'afinitat,  
**Per tal de** veure els seus perfils i dates d'estada.

**Criteris d'Acceptació**:
- Endpoint `GET /api/v1/trips/:trip_id/matches`.
- Retorna la llista de matches actius ordenats per `affinity_score DESC`.
- Cada match inclou: dades bàsiques de l'altre usuari (nom, avatar, origen), dates de solapament, ciutat, nivell d'afinitat i explicació textual.

---

### HU-MATCH-07: Safata de Notificacions In-App
**Com a** usuari (web o mòbil),  
**Vull** tenir un centre de notificacions on consultar els avisos recents de nous matches,  
**Per tal de** no perdre'm cap coincidència encara que no hagi obert la push.

**Criteris d'Acceptació**:
- Endpoint `GET /api/v1/notifications` per llistar notificacions recents.
- Endpoint `PUT /api/v1/notifications/:id/read` per marcar com a llegida.
- Endpoint `PUT /api/v1/notifications/read-all` per marcar-ho tot com a llegit.
