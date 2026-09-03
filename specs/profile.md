# Especificació de Mòdul: Perfil i Orígens (`profile`)

Aquest document defineix les històries d'usuari i criteris d'acceptació per al mòdul de perfil d'usuari i definició d'origen (`profile`).

---

## Estructura i Regles del Domini

1. **Jerarquia d'Orígens**:
   ```
   Country (País)
     └── Region (Regió / Comunitat)
          └── Town/City (Poble / Ciutat)
   ```
   - **Tots els orígens provenen de taules de referència precarregades a la base de dades.**
   - **No es permet l'entrada de text lliure per a la selecció d'origen.** L'usuari ha de seleccionar un País, una Regió d'aquell País, i una Ciutat/Poble d'aquella Regió.

2. **Imatge de Perfil**:
   - Les imatges de perfil s'emmagatzemen a un bucket de **Cloudflare R2** via l'API S3 compatible.
   - El backend gestiona la pujada segura o la generació de pre-signed URLs per pujar la foto a R2 i desem el seu URL públic/signat al camp `avatar_url` de l'usuari.

3. **Telèfon i MFA**:
   - Es permet afegir i guardar el número de telèfon de l'usuari (en format internacional E.164, p. ex. `+34612345678`) per preparar el suport d'autenticació multifactor (MFA).

---

## Històries d'Usuari

### HU-PROF-01: Consulta del Perfil d'Usuari
**Com a** usuari autenticat,
**Vull** veure el meu perfil (o el perfil d'un altre usuari de FELAG),
**Per tal de** consultar les dades personals, la foto de perfil, el telèfon (MFA) i el meu origen definit (País, Regió, Ciutat).

**Criteris d'Acceptació**:
- Permet obtenir les dades del perfil: Nom, email (només perfil propi), telèfon (`phone_number`, només perfil propi), foto de perfil (`avatar_url`), bio/descripció, i la jerarquia d'origen associada (País, Regió, Poble/Ciutat).
- Si l'usuari encara no ha configurat el seu origen o telèfon, aquests camps es retornen com a nuls o no definits.

---

### HU-PROF-02: Navegació per la Jerarquia d'Orígens (País → Regió → Ciutat)
**Com a** usuari configurant el seu origen,
**Vull** poder consultar el llistat de països, regions d'un país i ciutats/pobles d'una regió,
**Per tal de** trobar i seleccionar exactament d'on sóc sense poder escriure text lliure invàlid.

**Criteris d'Acceptació**:
- Endpoint `GET /api/v1/origins/countries`: Llista de països disponibles.
- Endpoint `GET /api/v1/origins/countries/:country_id/regions`: Llista de regions d'aquell país.
- Endpoint `GET /api/v1/origins/regions/:region_id/towns`: Llista de pobles/ciutats d'aquella regió.
- Només es poden seleccionar IDs d'entitats existents a la base de dades.

---

### HU-PROF-03: Definició i Edició de l'Origen de l'Usuari
**Com a** usuari registrat,
**Vull** assignar o canviar el meu origen triant un País, una Regió i una Ciutat/Poble del llistat,
**Per tal que** el sistema de matching de FELAG pugui saber exactament d'on sóc.

**Criteris d'Acceptació**:
- L'usuari envia un `town_id` (que conté de manera jeràrquica la relació amb la seva regió i país) o bé l'assignació explícita de `country_id`, `region_id`, `town_id`.
- El backend valida que la ciutat pertanyi a la regió seleccionada i que la regió pertanyi al país seleccionat.
- Es desa la relació al perfil de l'usuari.

---

### HU-PROF-04: Pujada de Foto de Perfil (Cloudflare R2)
**Com a** usuari autenticat,
**Vull** pujar o canviar la meva foto de perfil des de la web o l'app mòbil,
**Per tal de** personalitzar la meva identitat a FELAG.

**Criteris d'Acceptació**:
- Es suporten formats d'imatge estàndard (JPEG, PNG, WebP) amb un límit de mida (p. ex. màxim 5 MB).
- La imatge es processa i es desa al bucket de Cloudflare R2.
- El perfil de l'usuari s'actualitza amb l'URL d'accés a la imatge (`avatar_url`).

---

### HU-PROF-05: Edició d'Informació de Perfil (Nom, Bio, Telèfon MFA)
**Com a** usuari autenticat,
**Vull** modificar el meu nom visualitzat, la meva biografia curta i el meu número de telèfon,
**Per tal de** mantenir la meva informació actualitzada i preparar-me per a la verificació MFA.

**Criteris d'Acceptació**:
- Permet actualitzar el nom (no buit), la biografia (màxim 500 caràcters) i el telèfon (`phone_number`, validat amb format E.164, ex. `+34612345678`).
- Es retornen les dades actualitzades del perfil.
