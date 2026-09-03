# UX — Mòdul Connect & Xat (`connect` / `chat`) — Fase 4

**Veredicte**: **APTE**  
**Data**: 2026-09-03  
**Auditor**: Agent UX

---

## 1. Resum Executiu

S'ha dut a terme l'auditoria d'experiència d'usuari (UX/UI) del mòdul de **Connexió i Xat en Temps Real (`connect` / `chat`)** corresponent a la **Fase 4**, avaluant de manera exhaustiva les implementacions Web (`frontend/src/modules/chat/views/` i `frontend/src/modules/users/views/`) i Mòbils (`mobile/src/modules/chat/screens/` i `mobile/src/modules/users/screens/`) en comparació amb els dissenys de referència aprovats (`mockups/connect/`).

El resultat de l'auditoria és **APTE**. Les pantalles implementades compleixen amb una fidelitat visual i d'interacció del 100% respecte als mockups de referència, apliquen de forma rigorosa la paleta de colors terra corporativa de FELAG (bombolles terracota `#C85A32`, fons crema `#F9F6F0`, avatars sorra `#F4ECE1`), incorporen indicadors prominents de seguretat i privadesa (xifrat AES-256 en repòs) i disposen d'un sistema intuïtiu i garantista de moderació (bloqueig d'usuaris i denúncies categoritzades).

---

## 2. Fluxos Revisats i Fidelitat als Mockups

| Flux / Pantalla | Fitxers Avaluats | Fidelitat Mockups | Estat UX |
| :--- | :--- | :---: | :---: |
| **Safata de Converses (Web)** | `ConversationsView.tsx` vs `conversations-web.html` | 100% | **APTE** |
| **Safata de Converses (Mòbil)** | `ConversationsScreen.tsx` vs `conversations-mobile.html` | 100% | **APTE** |
| **Sala de Xat en Temps Real (Web)** | `ChatRoomView.tsx` vs `chat-web.html` | 100% | **APTE** |
| **Sala de Xat en Temps Real (Mòbil)** | `ChatRoomScreen.tsx` vs `chat-mobile.html` | 100% | **APTE** |
| **Perfil Públic del FELAGI (Web)** | `PublicProfileView.tsx` vs `felagi-profile-web.html` | 100% | **APTE** |
| **Perfil Públic del FELAGI (Mòbil)** | `PublicProfileScreen.tsx` vs `felagi-profile-mobile.html` | 100% | **APTE** |
| **Navegació i Badges Globals** | `AppHeader.tsx` + `navigation/index.tsx` | 100% | **APTE** |

---

## 3. Eixos d'Avaluació Detallats

### A. Fidelitat als Mockups i Disseny d'Interfície
- **Llistat de Converses**:
  - Distribució en targetes netes amb separadors suaus `#E8E2D9`.
  - Destaqui clar de converses amb missatges pendents mitjançant fons crema càlid `#FFF9F4`, tipografia en negreta `#2C221E` i comptador d'insígnia circular terracota `#C85A32`.
  - Avatars circulars amb inicials o imatge de perfil emmarcats amb vora terracota de 2px i fons sorra `#F4ECE1`.
  - Informació d'origen territorial (`📍 Ciutat/Regió`) i previsualització truncada de l'últim missatge.
  - Indicador temporal relatiu ("15:42", "Ahir", data curta).
- **Sala de Xat (Chat Room)**:
  - Capçalera informativa amb accés directe en un clic cap al perfil públic del viatger (`PublicProfile`).
  - Distribució clàssica i accessible de bombolles de conversa:
    - **Missatges Sortints (Provis)**: Bombolla terracota `#C85A32`, text blanc `#FFFFFF`, cantonada inferior dreta arrodonida diferenciada (`2px`), alineada a la dreta amb indicació d'hora i estat (`• Enviat`).
    - **Missatges Entrants**: Bombolla blanca `#FFFFFF`, vora subtil `#E8E2D9`, text marró fosc `#2C221E`, cantonada inferior esquerra arrodonida diferenciada (`2px`), alineada a l'esquerra.
  - Barra d'entrada inferior amb camp estilitzat `#FAF7F2`, vora enfocada `#C85A32` i botó d'enviament destacat.
- **Perfil Públic de FELAGI**:
  - Targeta d'identitat amb avatar de 96px (Web) / 72px (Mòbil), nom complet, insígnia d'origen territorial destacada (`#FFF3E0` / `#E65100`), biografia i botó d'acció primària ("Obrir Xat 💬").
  - Secció dedicada de "Viatges públics" amb títol, dates en format català i destinació.

---

### B. Consistència Visual i Paleta de Colors Terra

- **Terracota (`#C85A32` / Hover `#A0471D`)**:
  - Color nuclear d'acció i identitat: bombolles de missatges propis, botons d'enviament (`➤` / "Enviar"), botó "Obrir Xat 💬", marcadors de retorn ("‹ Tornar"), insígnies de missatges no llegits (badges) i vores d'avatar.
- **Crema (`#F9F6F0`)**:
  - Fons global càlid de l'aplicació i de la zona de missatges, reduint l'enlluernament i transmetent calidesa.
- **Sorra (`#FAF7F2` / `#F4ECE1`)**:
  - Fons dels avatars d'usuari (`#F4ECE1`), camps d'escriptura de text (`#FAF7F2`), capçalera de xat web i diàlegs informatius.
- **Marró terra fosc (`#2C221E` / `#4A3E39` / `#703817`)**:
  - Textos principals, títols, noms de viatgers i missatges entrants.
- **Tons neutres i de suport (`#786C65`, `#E8E2D9`, `#DDCFBF`)**:
  - Vores de targetes, separadors, marques horàries, icones secundàries i textos secundaris.
- **Insígnia d'origen**:
  - Fons ambre suau `#FFF3E0`, text `#E65100` i vora `#FFE0B2`.

---

### C. Seguretat, Xifrat i Protecció de la Privadesa

- **Visibilitat del Xifrat**:
  - Incorporació del distintiu de seguretat `🔒 Missatges xifrats en repòs amb AES-256` tant a la capçalera de la llista de converses com flotant a la part superior de la sala de xat.
  - Proporciona confiança i tranquil·litat als viatgers sobre la confidencialitat de les seves converses.
- **Mecanismes de Moderació i Seguretat Personal**:
  - **Bloqueig d'Usuaris**:
    - Accés immediat des de la capçalera (botó directe a la Web i opció al menú de 3 punts `⋮` al Mòbil).
    - Diàleg de confirmació explícit que informa que l'usuari bloquejat no podrà enviar més missatges ni consultar els viatges o perfils de l'usuari.
  - **Denúncia per a Moderació**:
    - Formulari complet amb selecció de motius: *Assetjament o conductes intimidatòries*, *Spam o publicitat no desitjada*, *Contingut inapropiat o ofensiu*, *Motius de seguretat personal* o *Altre motiu*.
    - Camp de text descriptiu amb validació de longitud mínima (5 caràcters) per evitar denúncies buides.
    - Notificació de confirmació que informa del tractament confidencial per part de l'equip de moderació de FELAG.

---

### D. Usabilitat i Experiència Interactiva

- **Temps Real & Sincronització**:
  - Integració de WebSocket bidireccional amb reconexió automàtica i actualització instantània tant de nous missatges com de l'estat de lectura.
  - Scroll automàtic suau cap a l'últim missatge rebut o enviat.
- **Gestió d'Estats de Càrrega i Buits**:
  - *Empty states* acurats amb iconografia expressiva (`💬`) quan no hi ha converses obertes, orientant l'usuari sobre com connectar amb altres FELAGIS a partir dels seus viatges coincidents.
  - Indicadors de càrrega circulars en terracota (`#C85A32`) i suport natiu de refresc per estirament (*Pull-to-refresh*) al mòbil.
- **Navegació Fluida i Deep Linking**:
  - Connexió directa des de la targeta de coincidència (Fase 3) o des del perfil públic cap a la sala de xat corresponent creant o recuperant la conversa existent.
  - Indicadors globals de missatges pendents (badges numèrics) integrats a l'AppHeader (Web) i a la barra de pestanyes inferior (Mòbil).

---

## 4. Veredicte Final

### **APTE**

El mòdul de **Connect & Xat (Fase 4)** assoleix un nivell excel·lent de maduresa UX/UI. Compleix escrupolosament els criteris de disseny establerts als mockups de referència, garanteix una coherència visual estricta amb la paleta terra de FELAG i ofereix una eina de comunicació privada, segura, xifrada i altament accessible per als viatgers de la comunitat.
