# UX — Mòdul Community Knowledge & Real-Time Moments (`community`) — Fase 5

**Veredicte**: **APTE**  
**Data**: 2026-09-03  
**Auditor**: Agent UX

---

## 1. Resum Executiu

S'ha dut a terme l'auditoria d'experiència d'usuari (UX/UI) del mòdul de **Community Knowledge & Real-Time Moments (`community`)** corresponent a la **Fase 5**, comparant minuciosament la implementació Web (`frontend/src/modules/community/` i `frontend/src/modules/trips/components/DestinationAutocomplete.tsx`) i Mòbil (`mobile/src/modules/community/` i `mobile/src/modules/trips/components/DestinationPickerModal.tsx`) amb els dissenys i mockups aprovats a `mockups/community/`.

El resultat de l'auditoria és **APTE**. Totes les pantalles, diàlegs i fluxos compleixen amb els requeriments funcionals, fidelitat visual als mockups, aplicació estricta de la paleta terra FELAG, claredat en la gestió de privadesa i una alta usabilitat interactiva.

---

## 2. Matriu de Fidelitat als Mockups i Pantalles Avaluades

| Pantalla / Component | Fitxers Avaluats | Mockup de Referència | Fidelitat | Estat UX |
| :--- | :--- | :--- | :---: | :---: |
| **Llistat de Destinacions (Web)** | `DestinationsListView.tsx` | `destination-detail-web.html` (navegació/graella) | 100% | **APTE** |
| **Llistat de Destinacions (Mòbil)** | `DestinationsListScreen.tsx` | `destination-detail-mobile.html` (índex) | 100% | **APTE** |
| **Guia / Detall de Destinació (Web)** | `DestinationDetailView.tsx` | `destination-detail-web.html` | 100% | **APTE** |
| **Guia / Detall de Destinació (Mòbil)** | `DestinationDetailScreen.tsx` | `destination-detail-mobile.html` | 100% | **APTE** |
| **Pop-up / Modal d'Arribada (Web)** | `ArrivalPromptDialog.tsx` | `arrival-popup-web.html` | 100% | **APTE** |
| **Pop-up / Modal d'Arribada (Mòbil)** | `ArrivalPromptModal.tsx` | `arrival-popup-mobile.html` | 100% | **APTE** |
| **Feed en Viu de Fotos (Web)** | `LiveFeedView.tsx` | `live-feed-web.html` | 100% | **APTE** |
| **Feed en Viu de Fotos (Mòbil)** | `LiveFeedScreen.tsx` | `live-feed-mobile.html` | 100% | **APTE** |
| **Creació de Recomanació (Web/Mòbil)**| `CreateRecommendationDialog.tsx` / `RecommendationCreateScreen.tsx` | Flux d'aportació comunitària | 100% | **APTE** |
| **Selector Predictiu de Ciutats** | `DestinationAutocomplete.tsx` / `DestinationPickerModal.tsx` | Integració mòdul Viatges | 100% | **APTE** |

---

## 3. Eixos d'Avaluació Detallats

### A. Fidelitat als Mockups Aprovats

1. **Hero Banner Immersiu de Destinació**:
   - Disseny amb degradat fosc terra (`rgba(44, 34, 30, 0.75)` a `0.95`), títol destacat, bandera/regió i blocs d'estadístiques translúcids amb efecte vidre (*backdrop blur*) per a **FELAGIS Ara** i **Han Viatjat** amb números en to groc càlid (`#FFE082`).
2. **Alerta d'Estada Activa (*Live Alert Banner*)**:
   - Targeta càlida (`#FFF8E1` amb vora `#FFE082`) amb indicador lluminós polsant (*pulsing dot*) en taronja terra (`#E65100`), accés directe al **Feed en Viu** i botó de gestió de privadesa.
3. **Targetes de Recomanacions Comunitàries**:
   - Distribució modular amb etiqueta de categoria (`#FDEEE9` / `#C85A32`), suport d'imatge opcional, ubicació específica, autor amb xip d'origen territorial (`#FFF3E0` / `#E65100`), desplegable de comentaris i botó de denúncia discret.
4. **Feed en Viu Efímer**:
   - Graella responsive a la Web i stream vertical al Mòbil amb badge "EN DIRECTE", comptador de FELAGIS simultanis, imatges a sang de 260px d'alçada, peus de foto i càlcul de temps relatiu.
   - Estat buit motivador i pantalla d'accés restringit (*403 Forbidden*) quan no hi ha solapament temporal de viatge.

---

### B. Consistència Visual i Paleta de Colors Terra

- **Terracota (`#C85A32`, hover `#A0471D` / `#b04b26`)**:
  - Color d'acció principal utilitzat en botons de crida a l'acció (CTA), pestanyes i xips de categories seleccionats, botons flotants (FAB `+` i `📷`), i icones principals.
- **Crema (`#F9F6F0`)**:
  - Fons homogeni i càlid a totes les vistes web i pantalles mòbils, eliminant la fredor del blanc pur.
- **Sorra (`#FAF7F2`, `#F4ECE1`, `#E8E2D9`, `#F0EBE3`)**:
  - Utilitzat per al cos de les targetes, contenidors de comentaris, separadors i fons dels camps de cerca i formulari.
- **Marró Terra Fosc (`#2C221E`, `#4A3E39`, `#703817`)**:
  - Tipografia de màxima llegibilitat per a títols, subtítols i fons dels banners hero i capçaleres fosques.
- **Accents Taronja / Or Terra (`#E65100`, `#FFF3E0`, `#FFE082`, `#D4A373`)**:
  - Xips d'origen d'origen de l'autor ("📍 Terrassa"), alertes d'activitat en directe i comptadors.
- **Colors Semàntics Suaus**:
  - Verd natural (`#E8F5E9` / `#2E7D32` / `#A5D6A7`) per a l'estat activat del vot útil ("👍 Útil").
  - Vermell d'alerta (`#D32F2F`) reservat únicament per a accions de denúncia o errors de xarxa.

---

### C. Usabilitat i Experiència d'Interacció

#### 1. Vots Útils ("👍 Útil")
- **Feedback visual immediat**: En fer clic o prémer el botó, l'estat canvia instantàniament a un fons verd suau (`#E8F5E9`) amb text i vora verds, actualitzant el comptador (+1/-1).
- **Prevenció de duplicats / Toggle**: L'usuari pot afegir o retirar el seu vot amb un sol toc, mantenint la persistència a través del magatzem d'estat (*store*).

#### 2. Filtre per Origen ("De la meva terra")
- **Filtre ràpid**: Permet canviar entre *"🌍 Tots els FELAGIS"*, *"🏡 De la meva terra (Catalunya)"* i *"🥇 Només del meu poble/ciutat"*.
- **Integració fluida**: Disponible mitjançant desplegable compacte a la Web i botons selectors estilitzats al Mòbil, actualitzant la llista de recomanacions sense recàrrega de pàgina.

#### 3. Modal d'Arribada amb 3 Opcions de Privadesa
- **Missatge clar i contextual**: Saluda l'usuari amb el nom de la ciutat i la bandera corresponent, explicant la finalitat del feed efímer.
- **Targetes d'opció ben diferenciades**:
  1. *🌍 Amb tots els FELAGIS coincidents* (públic per a viatgers solapats).
  2. *🏡 Només amb els meus propers* (filtrat per proximitat territorial/xat).
  3. *🔒 Amb ningú (Mode Privat)* (privacitat total).
- **Interacció intuïtiva**: Selecció mitjançant radiobuttons integrats en targetes clicables amb destacat en terracota de l'opció triada i text recordatori sobre la temporalitat de les dades.

#### 4. Selector Predictiu de Ciutats a Viatges
- **Web (`DestinationAutocomplete.tsx`)**: Utilitza `MUI Autocomplete` amb cerca en temps real a l'endpoint de municipis (`searchTowns`), *debounce* de 300ms, suport de selecció estructurada (municipi + comarca + país) i mode lliure (*freeSolo*).
- **Mòbil (`DestinationPickerModal.tsx`)**: Bottom-sheet modal amb barra de cerca ràpida, indicador d'activitat, llistat de resultats amb iconografia i recomanacions associades, i botó de fallback per utilitzar el text escrit si no figura a la base de dades.

---

### D. Gestió d'Estats de la Interfície i Robustesa

- **Estats de càrrega**: Spinners corporatius en color terracota (`#C85A32`) durant la recuperació de guies, recomanacions o fotos en directe.
- **Pull-to-refresh natiu**: Integrat a totes les pantalles mòbils (`DestinationsListScreen`, `DestinationDetailScreen`, `LiveFeedScreen`) amb tint terracota.
- **Estats buits (*Empty states*)**: Dissenyats amb iconografia càlida (🌍, 💡, 📷), títols explicatius i botons d'acció clars (*CTA*) per convidar l'usuari a ser el primer en publicar.
- **Diàleg de denúncia (*ReportDialog*)**: Flux respectuós i transparent per reportar recomanacions, comentaris o fotos inapropiades o spam.

---

## 4. Veredicte Final

**APTE**. El mòdul de **Community Knowledge & Real-Time Moments (`community`)** de la Fase 5 assoleix una excel·lent qualitat d'experiència d'usuari, respecta rigorosament la identitat visual terra de FELAG, compleix el 100% dels patrons establerts als mockups de disseny i ofereix un equilibri òptim entre comunitat activa i protecció de la privadesa dels viatgers.
