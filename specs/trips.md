# Especificació de Mòdul: Viatges (`trips`) — Fase 2

Aquest document defineix les històries d'usuari, el model de dades i els criteris d'acceptació per al mòdul de gestió de viatges i itineraris (`trips`).

---

## 🎯 Objectiu del Mòdul
Permetre als usuaris registrats definir on i quan viatjaran, gestionant viatges senzills o amb múltiples etapes/destinacions, i configurant la seva privacitat per al futur matching de la Fase 3.

---

## 📐 Model de Dades de Domini

### 1. Entitat `Trip` (Viatge)
- `id` (UUID, clau primària)
- `user_id` (UUID, referència a l'usuari propietari)
- `title` (VARCHAR, títol descriptiu del viatge, ex: *"Ruta per Escandinàvia"*)
- `description` (TEXT, opcional)
- `start_date` (DATE, data d'inici del viatge)
- `end_date` (DATE, data de finalització del viatge, `end_date >= start_date`)
- `visibility` (VARCHAR: `public`, `contacts_only`, `private` — per defecte `public`)
- `status` (VARCHAR: `planned`, `ongoing`, `completed`, `cancelled`)
- `created_at`, `updated_at`

### 2. Entitat `TripStage` (Etapa / Destinació del Viatge)
- `id` (UUID, clau primària)
- `trip_id` (UUID, clau forana a `trips`, ON DELETE CASCADE)
- `stage_order` (INTEGER, ordre seqüencial de l'etapa: 1, 2, 3...)
- `destination_name` (VARCHAR, nom de la ciutat/destinació, ex: *"Estocolm"*, *"Oslo"*)
- `country_code` (VARCHAR, codi ISO del país de destí, ex: `SE`, `NO`)
- `start_date` (DATE, data d'arribada a la destinació)
- `end_date` (DATE, data de sortida de la destinació)
- `notes` (TEXT, opcional)

---

## 📋 Històries d'Usuari

### HU-TRIP-01: Creació d'un Viatge
**Com a** usuari de FELAG,  
**Vull** crear un nou viatge indicant el títol, les dates i almenys una destinació,  
**Per tal de** poder planificar el meu viatge i tenir-lo registrat a la plataforma.

**Criteris d'Acceptació**:
- L'usuari ha d'introduir com a mínim:
  - Títol del viatge (no buit).
  - Data d'inici i data de fi (`end_date >= start_date`).
  - Almenys una etapa/destinació amb nom i dates.
- La visibilitat per defecte és `public` (apta per al matching de FELAG).
- El backend valida la coherència de les dates globals i de les etapes.
- Retorna el viatge creat amb el seu codi HTTP `201 Created`.

---

### HU-TRIP-02: Viatge amb Múltiples Destinacions / Itinerari
**Com a** usuari que fa una ruta per diversos llocs,  
**Vull** afegir múltiples etapes ordenades dins del mateix viatge,  
**Per tal que** FELAG pugui fer el matching exacte per a cada destinació i interval de dates.

**Criteris d'Acceptació**:
- Permet afegir 1 o més etapes a un viatge.
- Cada etapa conté el nom de la destinació, país i les seves dates pròpies d'estada.
- Les dates de cada etapa han d'estar compreses dins del rang global del viatge (`trip.start_date` a `trip.end_date`).
- Les etapes mantenen un ordre correlatiu (`stage_order`).

---

### HU-TRIP-03: Llistat dels Meus Viatges
**Com a** usuari autenticat,  
**Vull** veure la llista de tots els meus viatges organitzats per estat (Propers / En curs / Passats),  
**Per tal de** consultar d'un cop d'ull els meus plans de viatge.

**Criteris d'Acceptació**:
- Endpoint `GET /api/v1/trips` protegit per token JWT.
- Retorna la llista de viatges de l'usuari autenticat amb les seves destinacions resumides.
- Els viatges es poden filtrar per estat o data (`upcoming`, `past`).

---

### HU-TRIP-04: Consulta del Detall d'un Viatge
**Com a** usuari,  
**Vull** veure el detall complet d'un viatge i el seu itinerari amb totes les etapes,  
**Per tal de** revisar la informació i dates de cada ciutat.

**Criteris d'Acceptació**:
- Endpoint `GET /api/v1/trips/:id`.
- Retorna la informació del viatge i l'array ordenat d'etapes (`stages`).
- Si el viatge pertany a un altre usuari i és `private`, retorna un `403 Forbidden` o `404 Not Found`.

---

### HU-TRIP-05: Edició d'un Viatge i les Seves Etapes
**Com a** creador d'un viatge,  
**Vull** modificar el títol, les dates, la visibilitat o afegir/eliminar etapes,  
**Per tal d'** adaptar el viatge a canvis en els meus plans.

**Criteris d'Acceptació**:
- Endpoint `PUT /api/v1/trips/:id`.
- Només el propietari del viatge pot editar-lo (verificat pel JWT del backend).
- Permet actualitzar camps del viatge i sincronitzar la llista d'etapes.

---

### HU-TRIP-06: Eliminació d'un Viatge
**Com a** usuari,  
**Vull** eliminar un viatge que ja no faré,  
**Per tal que** no aparegui a la meva llista ni es tingui en compte per al matching.

**Criteris d'Acceptació**:
- Endpoint `DELETE /api/v1/trips/:id`.
- Només el propietari del viatge pot eliminar-lo.
- L'eliminació esborra en cascada les etapes associades (`trip_stages`).
- Retorna `204 No Content` o `200 OK`.

---

### HU-TRIP-07: Ajustos de Privacitat del Viatge
**Com a** usuari preocupat per la privacitat,  
**Vull** escollir el nivell de visibilitat del meu viatge (`public`, `contacts_only`, `private`),  
**Per tal de** controlar qui pot trobar-me en el matching de FELAG.

**Criteris d'Acceptació**:
- `public`: El viatge és visible per al matching general amb usuaris del mateix origen.
- `contacts_only`: El viatge només genera coincidències amb contactes directes.
- `private`: El viatge és només d'ús personal, exclòs completament del motor de matching.
