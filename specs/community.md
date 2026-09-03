# Especificació Funcional: Fase 5 — Community Knowledge & Real-Time Moments

## 1. Visió General
La **Fase 5** transforma FELAG en una guia viva de destinacions creada pels mateixos viatgers. Permet als FELAGIS descobrir racons secrets, recomanacions gastronòmiques, consells de mobilitat i anècdotes organitzades per ciutat/país, a més de compartir moments fotogràfics en temps real de forma segura i efímera durant les dates de solapament del viatge.

Aquesta fase també connecta les etapes dels viatges (`trip_stages`) directament amb la base de dades geogràfica normalitzada mitjançant selectors predictius/autocomplete (substituint el text lliure per vincles exactes a `towns` i `countries`).

---

## 2. Històries d'Usuari

### HU-COMM-01: Pàgines de Destinació Geogràfica
- **Com a** viatger,
- **vull** cercar i consultar la pàgina d'una destinació (ciutat o país),
- **per tal de** veure tota la informació pràctica, recomanacions de la comunitat i estadístiques de FELAGIS que hi han viatjat o hi són ara mateix.

**Criteris d'Acceptació:**
1. Endpoint `GET /api/v1/destinations/:id` (on `id` correspon a un `town_id` o `country_code` de la BD geogràfica).
2. Endpoint `GET /api/v1/destinations` amb cerca textual (`?q=Tokyo`) autocompletant amb ciutats i països existents.
3. La fitxa de destinació mostra el nom oficial, regió, país, bandera, número total de recomanacions i volum de FELAGIS que l'han visitat.

---

### HU-COMM-02: Publicació i Consulta de Recomanacions Categoritzades
- **Com a** FELAGI amb experiència a un lloc,
- **vull** publicar recomanacions i consells classificats per categoria amb foto opcional,
- **per tal de** transmetre consells valuosos als meus compatriotes que visitin el mateix destí.

**Criteris d'Acceptació:**
1. Categories permeses:
   - 🍽️ `food` (Gastronomia / Restaurants)
   - 💎 `hidden_gem` (Racó secret fora de rutes turístiques)
   - 🚆 `transport` (Mobilitat, targetes de transport, consells d'estalvi)
   - 💡 `practical_tip` (Consells pràctics: seguretat, endolls, moneda, horaris)
   - 📖 `anecdote` (Històries curioses i vivències locals)
2. Cada recomanació inclou: títol (màx. 120 caràcters), descripció (màx. 2.000 caràcters), categoria, adreça/ubicació opcional, foto adjunta opcional (pujada a Cloudflare R2) i l'autor amb el seu orígens territorials (poble/regió).
3. Endpoints: `GET /api/v1/destinations/:id/recommendations` (amb filtres per categoria i ordenació per utilitat o data) i `POST /api/v1/destinations/:id/recommendations`.

---

### HU-COMM-03: Vots d'Utilitat ("Útil 👍") i Comentaris en Fil
- **Com a** usuari que llegeix una recomanació,
- **vull** indicar si m'ha estat útil i comentar per demanar detalls,
- **per tal de** destacar el contingut més rellevant i interactuar amb l'autor.

**Criteris d'Acceptació:**
1. Botó d'acció toggle `POST /api/v1/recommendations/:id/vote` (*"M'ha estat útil 👍"*). Un usuari només pot comptabilitzar 1 vot d'utilitat per recomanació.
2. Comptador visible de vots útils per ordenar les recomanacions més ben valorades a la part superior.
3. Fils de comentaris: `GET /api/v1/recommendations/:id/comments` i `POST /api/v1/recommendations/:id/comments`.

---

### HU-COMM-04: Notificació Pop-up d'Arribada & Selector de Privadesa de Fotos
- **Com a** viatger que comença una estada a una destinació,
- **vull** veure una notificació pop-up en obrir la web o l'app mòbil preguntant-me amb qui vull compartir les meves fotos durant el viatge,
- **per tal de** triar el nivell de privadesa que prefereixo (tots els FELAGIS, només propers o ningú).

**Criteris d'Acceptació:**
1. **Disparador**: Quan un viatge entra en període actiu (`start_date <= avui <= end_date`), la primera vegada que l'usuari entra a la web o a l'app mòbil (o en rebre la notificació push d'arribada), s'obre un pop-up modal interactiu:
   - Títol: *«Benvingut/da a [Destinació]! 📍✨»*
   - Text: *«Vols compartir les teves fotos en temps real durant l'estada?»*
2. **Opcions de selecció (3 nivells)**:
   - 🌍 **Amb tots els FELAGIS** (`all_felagis`): Les fotos seran visibles per a qualsevol FELAGI amb solapament de dates i destinació.
   - 🏡 **Només amb els meus propers** (`close_origin`): Només visibles per a FELAGIS del meu mateix poble/regió d'origen o amb qui hagi fet match/xat.
   - 🔒 **Amb ningú (Privat)** (`none`): No compartir fotos al feed efímer i mantenir el viatge en mode privat.
3. L'elecció es desa a la configuració del viatge (`trips.photo_sharing_mode`) i es pot modificar en qualsevol moment des del detall del viatge.
4. **Feed Efímer de Destinació** (`GET/POST /api/v1/destinations/:id/live-feed`): Només permet publicar i visualitzar fotos als usuaris segons el nivell de privadesa seleccionat. Les imatges es desen a Cloudflare R2.

---

### HU-COMM-05: Filtres per Afinitat d'Origen
- **Com a** viatger,
- **vull** poder filtrar les recomanacions de la comunitat segons l'origen dels FELAGIS,
- **per tal de** prioritzar consells i racons recomanats per gent del meu mateix poble, comarca o territori.

**Criteris d'Acceptació:**
1. Selector de filtre a la pàgina de destinació: `Tots els FELAGIS` / `De la meva terra (mateix origen)`.
2. Quan s'aplica el filtre d'origen, es prioritzen les recomanacions d'usuaris amb coincidència de ciutat (`town`), regió (`region`) o país (`country`).

---

### HU-COMM-06: Moderació Comunitària de Continguts
- **Com a** usuari de FELAG,
- **vull** poder denunciar qualsevol recomanació, comentari o foto que sigui inapropiada o spam,
- **per tal de** mantenir un espai segur, de confiança i d'alta qualitat.

**Criteris d'Acceptació:**
1. Endpoint `POST /api/v1/recommendations/:id/report` i `POST /api/v1/live-feed/:id/report`.
2. Motius de denúncia: `spam`, `inappropriate_content`, `false_information`, `harassment`.
3. Si un contingut acumula múltiples denúncies o és reportat per motius greus, queda ocult preventivament fins a la revisió de moderació.

---

### HU-COMM-07: Selector Predictiu de Destinacions Normalitzades a Viatges
- **Com a** viatger que crea o edita un viatge,
- **vull** seleccionar la destinació d'un combo/autocomplete connectat a la base de dades geogràfica,
- **per tal de** garantir que les meves etapes es vinculin exactament a la ciutat (`town_id`) i país correctes.

**Criteris d'Acceptació:**
1. El formulari de viatge substitueix el camp de text lliure per un component `DestinationAutocomplete` que cerca ciutats i països a partir de 2 caràcters (`GET /api/v1/geo/towns?search=...`).
2. La taula `trip_stages` guarda `town_id` (FK a `towns(id)`), `region_id` (FK a `regions(id)`), `country_code` i `destination_name`.
3. Des del detall d'un viatge es pot navegar directament a la pàgina de la destinació (`/destinations/:id`).

---

## 3. Criteris de Finalització (Definition of Done)
- La creació de viatges utilitza el selector de destinacions geogràfic normalitzat.
- Un usuari pot cercar ciutats o països i accedir a la seva pàgina de destinació.
- Els usuaris poden publicar recomanacions amb fotos i votar la seva utilitat.
- Els viatgers en actiu reben el pop-up d'arribada amb els 3 nivells de privadesa i accedeixen al feed efímer de fotos.
- La moderació i el filtratge per orígens funcionen tant a Web com a l'App Mòbil.
