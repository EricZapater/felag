# Especificació Funcional: Mòdul de Destinacions Públiques & SEO (Public Destination Guides)

## 1. Visió General
El mòdul de **Destinacions Públiques & SEO** obre el coneixement col·lectiu de FELAG a la web oberta i als motors de cerca (Google, Bing, etc.) mitjançant pàgines de destinació indexables i optimitzades per al posicionament orgànic.

Aquest mòdul consolida, agrega i anonimitza estrictament les recomanacions, consells pràctics i racons secrets compartits pels felagis que han estat marcats amb visibilitat pública. L'objectiu és doble:
1. **Captació de nous usuaris (SEO)**: Proporcionar contingut genuí, estructurat (Schema.org / JSON-LD) i ric en paraules clau sobre destinacions mundials vistes des de l'òptica dels viatgers de la comunitat.
2. **Privadesa i seguretat radicals**: Evitar completament l'exposició de dades personals (noms, cognoms, fotos de perfil, IDs d'usuari) i dates precises de viatges. La informació es presenta consolidada amb avals agregats (*«X felagis ho avalen»*) i granularitat temporal màxima de mes i any (ex: *«Recomanat el juny de 2025»* o *«2025»*).

---

## 2. Principis Fonamentals de Disseny i Privadesa

### 2.1. Principi de Resguard de la Identitat
- **Zero dades personals identificables (PII)**: Les respostes públiques no contenen noms, cognoms, àlies, noms d'usuari, avatars ni identificadors personals dels autors.
- **Avals col·lectius**: En lloc de *"Joan de Mataró recomana..."*, el sistema exposa *"Recomanat per 1 felagi"* o *"4 felagis avalen aquest consell"*.
- **Temporalitat agregada**: Es prohibeixen els timestamps exactes (`2025-06-12T14:30:00Z`). L'API només exposa el mes i any (`"2025-06"`) o any (`"2025"`).

### 2.2. Filtre de Visibilitat Pública
- Només s'exposen recomanacions i consells marcats explícitament amb visibilitat pública (`is_public = true` o `visibility = 'public'`) i que no estiguin pendents de moderació ni denunciades.

### 2.3. Arquitectura SEO & Web Rendering
- **URLs amigables (Slugs SEO)**: Identificadors basats en text (`/destinacions/tokyo-japo`, `/destinacions/isfer-marroc`).
- **Structured Data (JSON-LD)**: Esquemes Schema.org `TouristDestination`, `TouristAttraction`, `ItemList` i `FAQPage`.
- **Sitemap & Índex públic**: Endpoints per generar el sitemap XML i llistats paginats per rastrejadors.

---

## 3. Històries d'Usuari

### HU-PUBSEO-01: Llistat Públic de Destinacions Indexables i Sitemap
- **Com a** motor de cerca (Googlebot) o visitant no registrat,
- **vull** obtenir el llistat de destinacions disponibles a FELAG amb contingut públic consolidat,
- **per tal de** descobrir i indexar totes les guies de ciutats i països disponibles a la plataforma.

**Criteris d'Acceptació:**
1. Endpoint públic `GET /api/v1/public/destinations` amb suport de paginació (`page`, `limit`), filtre per país/regió i ordenació per popularitat (volum de consells o volum de felagis).
2. Cada element del llistat inclou:
   - `id`: Identificador normalitzat de ciutat (`town_id`) o país (`country_code`).
   - `name`: Nom oficial de la destinació (ex: *Tòquio*).
   - `country_name`: País (ex: *Japó*).
   - `country_code`: Codi ISO de 2 lletres (ex: *JP*).
   - `slug`: Identificador URL semàntic únic (ex: `tokyo-japo`).
   - `total_felagis_count`: Nombre consolidat de felagis que han visitat o avaluat la destinació.
   - `total_recommendations_count`: Nombre total de consells públics.
   - `cover_image_url`: Imatge de capçalera representativa de la destinació (sense persones identificables).
   - `updated_at_month`: Darrera actualització en format `AAAA-MM` (ex: `2025-06`).
3. Endpoint públic `GET /api/v1/public/sitemap` que retorna l'arbre de rutes públiques amb dates d'última actualització (`lastmod`) i prioritats per facilitar la generació de `sitemap.xml` al frontend.

---

### HU-PUBSEO-02: Fitxa Pública de Destinació Consolidada i Anonimitzada
- **Com a** viatger que cerca a Google informació sobre un destí,
- **vull** consultar una pàgina completa amb consells pràctics, llocs per visitar i gastronomia recomanada per la comunitat de FELAG,
- **per tal de** planificar el meu viatge i conèixer el valor de la plataforma sense que es reveli la identitat de cap usuari.

**Criteris d'Acceptació:**
1. Endpoint públic `GET /api/v1/public/destinations/{slug_or_id}` que accepta el `slug` SEO (ex: `tokyo-japo`) o l'identificador tècnic.
2. La resposta retorna:
   - **Informació bàsica**: Nom, país, bandera, descripció general, imatge principal.
   - **Mètriques agregades de comunitat**:
     - *«Visitada per X felagis»*.
     - *«Y consells locals i racons secrets compartits»*.
   - **Categories consolidades**:
     - `food`: Restaurants, plats típics i mercats.
     - `hidden_gem`: Racons secrets fora de la ruta habitual.
     - `transport`: Consells de targetes de metro, trens i mobilitat eficient.
     - `practical_tip`: Requisits, divises, seguretat, endolls i èpoques recomanades.
     - `anecdote`: Costums culturals i curiositats locals.
3. **Anonimització estricta de cada consell**:
   - Cada consell conté: `id`, `title`, `description`, `category`, `location_hint` (ex: barri o carrer aproximat, opcional), `endorsements_count` (ex: 5), `endorsement_label` (*«5 felagis ho avalen»*), `period` (`2025-05` o `2025`), `photo_url` (només fotos de paisatge/menjar/lloc sense cares).
   - **Cap camp d'usuari**: No s'inclouen `user_id`, `author_name`, `user_avatar`, ni data/hora exacta.
4. Si la destinació no té prou contingut públic mínim (ex: menys de 2 recomanacions públiques), l'endpoint indica si està buida o recomana destins relacionats propers per evitar *thin content* de cara al SEO.

---

### HU-PUBSEO-03: Agregació de Suport Social («X felagis ho avalen»)
- **Com a** visitant de la web pública de FELAG,
- **vull** veure el grau de consens i suport que té cada consell o racó secret,
- **per tal de** confiar en la veracitat i utilitat de la informació.

**Criteris d'Acceptació:**
1. El recompte d'avals (`endorsements_count`) es calcula a partir de la suma de:
   - Autors de recomanacions coincidents o agrupades.
   - Vots de *"M'ha estat útil 👍"* registrats per usuaris de FELAG a l'aplicació.
2. El sistema genera el text en la llengua corresponent:
   - 1 aval: *«1 felagi ho avala»*.
   - 2 o més: *«X felagis ho avalen»*.
3. Les recomanacions amb major volum d'avals es retornen ordenades prioritàriament a cada categoria.

---

### HU-PUBSEO-04: Metadades SEO, Paraules Clau Dinàmiques i Structured Data (JSON-LD)
- **Com a** responsable de creixement i posicionament de FELAG,
- **vull** que l'API proporcioni les metadades d'optimització (SEO Pack) calculades per a cada destí,
- **per tal de** que el frontend pugui renderitzar directament les etiquetes `<head>` (`<title>`, `<meta name="description">`, Open Graph, Twitter Cards) i el bloc `<script type="application/ld+json">`.

**Criteris d'Acceptació:**
1. L'endpoint de destinació pública inclou l'objecte `seo`:
   - `meta_title`: Format optimitzat, ex: *«Guia de viatge a Tòquio: consells i racons secrets de felagis | FELAG»* (màx. 60 caràcters recomanats).
   - `meta_description`: Resum atractiu que inclogui xifres reals (ex: *«Descobreix 14 consells pràctics i racons secrets a Tòquio avalats per 28 felagis. Gastronomia, transport i rutes locals.»*) (màx. 155-160 caràcters).
   - `keywords`: Array de paraules clau estratègiques (ex: `["viatjar a Tòquio", "consells Tòquio", "què veure a Tòquio", "restaurants Tòquio", "felagis Japó"]`).
   - `canonical_url`: URL canònica oficial (ex: `https://felag.app/destinacions/tokyo-japo`).
   - `og_image_url`: Imatge optimitzada per a xarxes socials (1200x630) amb composició del destí i marca FELAG.
   - `structured_data_json`: Objecte JSON-LD conforme a l'estàndard Schema.org:
     - `@context: "https://schema.org"`
     - `@type: "TouristDestination"` o `"Guide"`
     - `name`: Nom de la destinació
     - `description`: Descripció resumida
     - `aggregateRating` o llista d'elements d'atracció turística (`TouristAttraction`).
     - Bloc de `FAQPage` automàtic generat a partir dels consells pràctics (ex: *«Com moure's en transport públic per Tòquio?»* -> Consell més avalat).
2. Capçaleres HTTP per a bots: L'API retorna capçaleres `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200` per optimitzar la càrrega des de CDNs i reduir càrrega al backend.

---

### HU-PUBSEO-05: Secció de Preguntes Freqüents Públiques (FAQ SEO Rich Snippets)
- **Com a** usuari que cerca dubtes freqüents a Google sobre el destí,
- **vull** veure respostes sintetitzades a les preguntes típiques (moneda, transport, millor època, racons),
- **per tal de** trobar ràpidament el consell clau i obtenir un resultat destacat (Rich Snippet) als cercadors.

**Criteris d'Acceptació:**
1. L'API retorna un array `faqs` dins la resposta pública de destinació.
2. Cada FAQ inclou `question` i `answer` derivades automàticament de les recomanacions consolidades més valorades de la categoria `practical_tip` i `transport`.
3. S'inclou la referència d'avals col·lectius (ex: *«Consell avalat per 6 felagis»*).

---

## 4. Decisions de Producte Validades (Checkpoint 1 Aprovat)

1. **Idiomes i Internacionalització del SEO (i18n)**:
   - Els endpoints públics suporten oficialment el paràmetre `?lang=ca|es|en` (predeterminat: `ca`).
   - L'estructura de l'API retorna les metadades SEO (`meta_title`, `meta_description`, `keywords`, textos d'avals *«X felagis ho avalen» / «X felagis lo avalan» / «Endorsed by X felagis»*, i FAQs) adaptades a l'idioma seleccionat, juntament amb els enllaços d'etiqueta `hreflang` per a la indexació multilingüe a Google.
2. **Generació d'imatges socials dinàmiques (Open Graph)**:
   - S'inclou suport per a imatges dinàmiques `og_image_url` amb metadades i estadístiques del destí (nom, nombre de felagis i recomanacions).
3. **Toggle de visibilitat pública al formulari de consells**:
   - S'incorpora un toggle explícit al formulari de creació/edició de recomanacions (similar al de viatges): *"Fer públic a la guia web del destí (sense revelar el meu nom)"* (`is_public: boolean`, per defecte `true`).
4. **Llindar mínim d'indexació (`robots: index` vs `noindex`)**:
   - Una destinació requereix com a **mínim 1 consell públic** (`total_tips >= 1`) per a ser indexable (`robots: "index, follow"`) i constar al `sitemap.xml`. Si té 0 consells, l'API retorna `robots: "noindex, follow"` i queda exclosa del sitemap per evitar contingut buit (*thin content*).

---

## 5. Criteris de Finalització (Definition of Done)
- [x] L'especificació cobreix la privadesa absoluta (sense noms, sense IDs, dates agregades mes/any).
- [x] S'especifica la consolidació per destí i els textos d'aval (*«X felagis ho avalen»*).
- [x] Suport multiidioma (`ca`, `es`, `en`) als endpoints i metadades SEO.
- [x] Toggle de visibilitat pública als consells.
- [x] Llindar d'indexació (mínim 1 consell).
- [x] El contracte OpenAPI a `contracts/public-destinations.openapi.yaml` reflexa fidelment aquests requeriments.
