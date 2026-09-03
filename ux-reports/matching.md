# UX — Mòdul Matching & Notificacions (`matching`) — Fase 3

**Veredicte**: **APTE**  
**Data**: 2026-09-03  
**Auditor**: Agent UX

---

## 1. Resum Executiu

S'ha dut a terme l'auditoria integral d'experiència d'usuari (UX/UI) del mòdul de **Coincidències (Matching) i Notificacions Push / In-App** de la **Fase 3**, avaluant les implementacions web (`frontend/src/modules/matching/` i `frontend/src/modules/notifications/`) i mòbils (`mobile/src/modules/matching/` i `mobile/src/modules/notifications/`) en comparació amb els mockups de disseny de referència (`mockups/matching/`).

El resultat de l'auditoria és **APTE**. Totes les pantalles implementades respecten fil per randa la disposició, components, interaccions i patrons visuals dels mockups, apliquen de forma rigorosa la paleta de colors terra de FELAG, garanteixen una claredat òptima en el motiu de les coincidències i ofereixen una navegació bidireccional fluida entre el detall del viatge, les alertes i la llista de coincidències.

---

## 2. Fluxos Revisats i Fidelitat als Mockups

| Flux / Pantalla | Fitxers Avaluats | Fidelitat Mockups | Estat UX |
| :--- | :--- | :---: | :---: |
| **Coincidències de Viatge (Web)** | `TripMatchesView.tsx` vs `trip-matches-web.html` | 100% | **APTE** |
| **Coincidències de Viatge (Mòbil)** | `TripMatchesScreen.tsx` vs `trip-matches-mobile.html` | 100% | **APTE** |
| **Safata de Notificacions (Web)** | `NotificationsView.tsx` vs `notifications-web.html` | 100% | **APTE** |
| **Safata de Notificacions (Mòbil)** | `NotificationsScreen.tsx` vs `notifications-mobile.html` | 100% | **APTE** |
| **Navegació des del Detall (Web)** | `TripDetailView.tsx` + `AppHeader.tsx` | 100% | **APTE** |
| **Navegació des del Detall (Mòbil)** | `TripDetailScreen.tsx` + `navigation/index.tsx` | 100% | **APTE** |

---

## 3. Eixos d'Avaluació Detallats

### A. Fidelitat als Mockups de Disseny Aprovats
- **Banner del Viatge i Comptador**: Presentació destacada de les dades bàsiques del viatge (títol, dates i destinacions) i capçalera amb comptador dinàmic de coincidències ("✨ X FELAGIS coincidents trobats").
- **Targetes de Coincidència (Match Cards)**:
  - Avatar amb inicials o imatge de perfil amb vora terracota de 2px i fons sorra.
  - Informació d'usuari clara: nom complet, indicador d'origen amb icona 📍 i caixa de motiu contextual.
  - Insígnia d'afinitat jeràrquica a la cantonada superior/dreta.
  - Especificació de dates de solapament amb còmput precís de dies i destinació comuna.
  - Botó d'acció primària "Connectar amb {Nom}" amb feedback mitjançant diàleg modal (Web) o `Alert` natiu (Mòbil).
- **Centre de Notificacions**:
  - Format llista amb separadors suaus de vora `#E8E2D9`.
  - Icones temàtiques circulars per tipus de notificació (`✨` nou match, `✈️` viatges, `👋` sistema).
  - Estat no llegit identificat amb fons càlid `#FFF9F4` i punt indicador terracota `#C85A32`.
  - Botó per "Marcar-ho tot com a llegit" / "Llegir tot" disponible quan hi ha elements pendents.
  - Càlcul de temps relatiu natural en català ("Ara mateix", "Fa 15 minuts", "Fa 2 hores", "Fa 2 dies").

### B. Consistència Visual i Paleta de Colors Terra
- **Terracota (`#C85A32` / Hover `#A0471D`)**:
  - Color d'èmfasi i acció primària als botons de connexió, marcadors de retorn ("‹ Tornar"), enllaços actius de capçalera/pestanyes, punts de notificació no llegida i insígnies numèriques del comptador d'avisos pendents.
- **Crema (`#F9F6F0`)**:
  - Fons global càlid tant a la versió escriptori com a l'aplicació mòbil.
- **Sorra (`#FAF7F2` / `#F4ECE1`)**:
  - Fons dels avatars d'usuari (`#F4ECE1`), caixes d'explicació de coincidència (`#FAF7F2`), capçaleres de resum de viatge i banners de matching.
- **Marró terra fosc (`#2C221E` / `#3E2723` / `#4A3E39`)**:
  - Textos principals, noms d'usuaris, títols de viatge i tipografia jeràrquica.
- **Sistema de Badges d'Afinitat (Daurat / Ambre / Marró)**:
  - 🥇 **Mateix Poble / Ciutat (`town`)**: Fons daurat càlid `#FFF3E0`, text taronja fosc `#E65100`, vora `#FFE0B2`.
  - 🥈 **Mateixa Regió (`region`)**: Fons sorra càlida `#F4ECE1`, text marró terra `#703817`, vora `#DDCFBF`.
  - 🥉 **Mateix País (`country`)**: Fons terra suau `#EAE6E1` / `#EFEBE9`, text neutre fosc `#4A3E39`, vora `#D1C9C0`.

### C. Claredat Visual del Motiu de la Coincidència
- **Comprensió Immediata**: Cada targeta de coincidència sintetitza de manera molt intuïtiva:
  1. *Qui és*: Nom i origen territorial declarat (ciutat/comarca/regió).
  2. *Per què coincideixen*: Caixa destacada amb explicació natural (ex: *"Tots dos sou de Vic i coincidireu a Estocolm!"*).
  3. *Grau de proximitat*: Insígnia amb medalla i nivell territorial (🥇 Mateix Poble / 🥈 Mateixa Regió / 🥉 Mateix País).
  4. *On i quan*: Dates exactes de solapament cronològic i durada en dies a la ciutat compartida.

### D. Navegació des del Viatge i Integració Global
- **Accés des del Detall del Viatge (`TripDetail`)**:
  - Quan un viatge és públic (`visibility === 'public'`), es desplega un banner de crida a l'acció amb el títol "✨ FELAG Matching" i el botó "Veure coincidències", a més d'un botó d'accés ràpid "Coincidències FELAGIS ✨".
- **Retorn Contextual**:
  - Botó superior de retorn ("‹ Tornar al detall del viatge" / "‹ Viatge") que manté la continuïtat de navegació.
- **Deep Linking des de Notificacions**:
  - En prémer sobre una notificació de nou match, tant la versió Web com la Mòbil marquen la notificació com a llegida i naveguen automàticament a la pantalla de coincidències d'aquell viatge concret (`/trips/:id/matches`).
- **Indicadors de Comptador Global (Badges)**:
  - Recompte d'avisos pendents integrat a l'AppHeader (Web) i a la barra inferior de pestanyes (Mòbil).

### E. Estats de la Interfície i Feedback
- **Estats Buits ('Empty States')**:
  - Disseny cuidat amb iconografia expressiva (🔍 / 🔔 / 👥) i missatges tranquil·litzadors que expliquen el funcionament del matching asíncron quan no hi ha coincidències ni alertes.
- **Pull-to-refresh & Loading**:
  - Indicadors de càrrega sincronitzats amb el color terracota de marca i suport de refresc tàctil a les pantalles mòbils.
- **Gestió d'Errors**:
  - Banners d'alerta contextuals davant d'errors de connexió o peticions no satisfetes.

---

## 4. Veredicte Final

### **APTE**

La implementació de la **Fase 3 (Matching & Notificacions)** assoleix un nivell excel·lent de qualitat UX/UI. Compleix amb total fidelitat els mockups aprovats, manté una coherència impecable amb el sistema de disseny i paleta terra de FELAG, i ofereix als usuaris una experiència comprensible, atractiva i altament funcional per connectar amb viatgers de la seva mateixa terra.
