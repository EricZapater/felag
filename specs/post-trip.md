# Especificació Funcional: Fase 6 — Post-Trip Experience: Celebration, Feedback & Exploration

## 1. Visió General
La **Fase 6** completa el cicle de vida del viatge a FELAG. Introdueix el **Hub de Viatge Actiu** (amb àlbum de fotos del viatge i generador de Celebration Cards en qualsevol moment de l'estada) i el **Ritual de Tancament el dia final (`end_date <= NOW()`)** amb feedback a la comunitat i el **Reportatge 9:16 per a Instagram Stories**.

A més, incorpora el **Motor d'Exploració Global** per descobrir destinacions inspirades en viatgers del mateix territori.

---

## 2. Històries d'Usuari

### HU-POST-01: Hub de Viatge Actiu («El meu viatge en curs»)
- **Com a** viatger que té un viatge en curs (`start_date <= avui <= end_date`),
- **vull** tenir un panell d'accions ràpides a la pantalla principal i al detall del viatge,
- **per tal de** gestionar els meus records, crear targetes de trobada i consultar el feed en directe en qualsevol moment.

**Criteris d'Acceptació:**
1. Targeta destacada de Viatge Actiu amb accés directe a:
   - 📸 **Celebration Card («Ens hem trobat! 🎉»)**
   - 🖼️ **Àlbum de Fotos del Viatge**
   - 📍 **Feed en Viu de la ciutat**
   - 🔒 **Privadesa de compartició**
2. Endpoint `GET /api/v1/trips/active-hub` amb l'estat del viatge en curs.

---

### HU-POST-02: Àlbum / Galeria de Fotos del Viatge (Prerequisit)
- **Com a** viatger,
- **vull** anar afegint fotos a l'àlbum del meu viatge durant l'estada,
- **per tal de** conservar els meus records i nodrir el resum final del viatge.

**Criteris d'Acceptació:**
1. Taula `trip_photos` (id, trip_id, user_id, image_url, caption, town_id, taken_at, created_at).
2. Endpoints: `GET /api/v1/trips/:id/photos` i `POST /api/v1/trips/:id/photos` (pujada d'imatges a Cloudflare R2).
3. Les fotos es poden marcar com a destacades per al reportatge d'Instagram.

---

### HU-POST-03: Celebration Card («Ens hem trobat! 📸») en Temps Real
- **Com a** viatger que s'ha trobat amb un altre FELAGI a qualsevol moment del viatge,
- **vull** pujar el selfie de la trobada i generar a l'instant la targeta commemorativa oficial,
- **per tal de** celebrar el moment, enviar-la al xat i compartir-la a xarxes socials immediatament.

**Criteris d'Acceptació:**
1. Disponible **durant tot el viatge** i també un cop finalitzat.
2. L'usuari selecciona el FELAGI (de la llista de matches/xats o cerca) i puja la foto de la trobada.
3. Es genera la targeta oficial FELAG:
   - *"L'Èric (Terrassa) i el Marc (Sabadell) s'han trobat a Tòquio! 🗼✨"*.
   - Data, bandera de la destinació i branding terracota.
4. Endpoints: `POST /api/v1/trips/:id/celebration-cards` i `GET /api/v1/trips/:id/celebration-cards`.
5. La targeta s'envia automàticament com a missatge destacat al xat entre ambdós usuaris i es pot descarregar / compartir.

---

### HU-POST-04: Ritual de Tancament del Viatge (Dia final: `end_date <= NOW()`)
- **Com a** viatger que arriba a l'últim dia o ha tornat a casa,
- **vull** completar el ritual de tancament amb la valoració de l'experiència i la generació del reportatge final,
- **per tal de** concloure el viatge satisfactòriament.

**Criteris d'Acceptació:**
1. S'activa a partir de la data final (`end_date <= NOW()`).
2. **Valoració & Consells**: Puntuació 1-5 ⭐ i publicació directa de consells a la guia de destinació de la ciutat (`POST /api/v1/trips/:id/feedback`).
3. Estat de completitud: `GET /api/v1/trips/:id/wrapup-status`.

---

### HU-POST-05: Reportatge Instagram Stories en format 9:16
- **Com a** viatger,
- **vull** generar una targeta vertical 9:16 amb el resum del viatge basada en el meu àlbum de fotos,
- **per tal de** publicar-la fàcilment a Instagram Stories, Reels, TikTok o WhatsApp Status.

**Criteris d'Acceptació:**
1. Targeta gràfica 1080x1920 (proporció 9:16) amb:
   - Títol de l'aventura i destinacions recorregudes.
   - Estadístiques: dies totals, etapes i FELAGIS coneguts.
   - Mosaic fotogràfic compost a partir de les fotos de l'àlbum del viatge (`trip_photos`).
   - Logotip i paleta de colors càlids de FELAG.
2. Botó **«Descarregar Imatge 📥»** i **«Compartir 📲»** (Web Share API a Web i React Native Share a Mòbil).
3. Endpoint: `GET /api/v1/trips/:id/stories-card-data`.

---

### HU-POST-06: Motor d'Exploració Global & Recomanacions de Destinacions
- **Com a** qualsevol usuari de FELAG,
- **vull** explorar destins i rebre recomanacions basades en les preferències de viatgers del meu mateix origen,
- **per tal de** trobar inspiració per a propers viatges.

**Criteris d'Acceptació:**
1. Endpoint `GET /api/v1/explore/recommendations`.
2. Secció *"A on viatgen els FELAGIS del teu poble/comarca?"* integrada a Destins.

---

## 3. Criteris de Finalització (Definition of Done)
- El Hub de Viatge Actiu permet pujar fotos a l'àlbum i generar Celebration Cards en qualsevol moment.
- El ritual de tancament s'activa el dia final del viatge amb feedback i el reportatge 9:16.
- Es pot exportar i compartir el reportatge vertical 9:16 a xarxes socials.
- L'exploració oberta de destinacions està accessible per a tothom.
