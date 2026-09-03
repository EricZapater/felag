# UX — Mòdul Viatges (`trips`) — Fase 2

**Veredicte**: **APTE**  
**Data**: 2026-09-03  
**Auditor**: Agent UX

---

## 1. Resum Executiu

S'ha dut a terme l'auditoria d'experiència d'usuari (UX/UI) del mòdul de **Viatges (`trips`)** corresponent a la **Fase 2**, avaluant tant la versió Web (`frontend/src/modules/trips/`) com la versió Mòbil (`mobile/src/modules/trips/`) en comparació amb els mockups de disseny aprovats (`mockups/trips/`).

El resultat de l'auditoria és **APTE**, complint satisfactòriament amb tots els criteris d'usabilitat, fidelitat visual als mockups, aplicació estricta de la paleta terra i gestió de feedback a l'usuari.

---

## 2. Fluxos Revisats i Fidelitat als Mockups

| Flux / Pantalla | Fitxers Avaluats | Fidelitat Mockups | Estat UX |
| :--- | :--- | :---: | :---: |
| **Llistat de Viatges (Web)** | `TripsListView.tsx` vs `trips-list-web.html` | 100% | **APTE** |
| **Llistat de Viatges (Mòbil)** | `TripsListScreen.tsx` vs `trips-list-mobile.html` | 100% | **APTE** |
| **Creació Multietapa (Web)** | `TripCreateView.tsx` vs `trip-create-web.html` | 100% | **APTE** |
| **Creació Multietapa (Mòbil)** | `TripCreateScreen.tsx` vs `trip-create-mobile.html` | 100% | **APTE** |
| **Detall i Itinerari (Web)** | `TripDetailView.tsx` vs `trip-detail-web.html` | 100% | **APTE** |
| **Detall i Itinerari (Mòbil)** | `TripDetailScreen.tsx` vs `trip-detail-mobile.html` | 100% | **APTE** |

---

## 3. Eixos d'Avaluació Detallats

### A. Fidelitat als Mockups Aprovats
- **Llistat**: Distribució clara en graella (web) i targetes modulars (mòbil), amb diferenciació automàtica de viatges propers/en curs vs viatges passats, insígnies d'estat i resum d'etapes.
- **Creació de Viatge**: Formulari dividit orgànicament entre dades generals (títol, dates, visibilitat, descripció) i secció dinàmica d'etapes amb botó destacat de "+ Afegir etapa / destinació".
- **Detall**: Visualització d'itinerari amb línia de temps vertical (timeline), nodes numerats, dates per etapa, càlcul de dies totals i banner informatiu preparat per a la Fase 3 de Matching.

### B. Consistència Visual i Paleta de Colors Terra
- **Terracota (`#C85A32` / Hover `#A0471D`)**: Utilitzat com a color d'acció primària (botons principals, números de l'itinerari, pestanyes seleccionades, icones d'afegir).
- **Crema (`#F9F6F0`)**: Fons de pàgina i pantalla que proporciona calidesa i redueix la fatiga visual.
- **Sorra (`#FAF7F2` / `#F4ECE1`)**: Utilitzat per a les targetes d'etapes, caixes de resum, diàlegs i caixes informatives del banner de matching.
- **Marró terra fosc (`#2C221E` / `#3E2723`)**: Textos principals, títols i tipografia d'alta llegibilitat.
- **Tons neutres i secundaris (`#786C65`, `#DDCFBF`, `#E8E2D9`)**: Vores suaus, subtítols i dates secundàries.
- **Colors semàntics**: Verd suau (`#E8F5E9` / `#2E7D32`) per a visibilitat pública/matching; vermell d'alerta (`#d32f2f`) reservat exclusivament per a accions d'eliminació.

### C. Usabilitat i Experiència en Creació Multietapa
- **Gestió dinàmica d'etapes**: Afegir i eliminar etapes de forma instantània tant al formulari web com mitjançant el modal dedicat a la versió mòbil.
- **Prevenció d'errors i validació**:
  - Validació prèvia d'existència de títol i dates generals.
  - Comprovació de coherència cronològica (data d'inici anterior o igual a la data de fi del viatge i de cada etapa).
  - Requisit d'almenys una etapa per completar la creació del viatge.
- **Confirmació d'accions destructives**: Implementació de diàlegs modals de confirmació abans d'eliminar un viatge (`Dialog` a MUI i `Alert.alert` a React Native).

### D. Feedback Visual i Estats de la Interfície
- **Estats de càrrega**: Indicadors visuals de progrés (`CircularProgress` / `ActivityIndicator`) i estats `disabled` + text "Guardant..." als botons d'acció durant les peticions de xarxa.
- **Suport 'Pull-to-refresh'**: Integració nativa de `RefreshControl` a la pantalla de viatges mòbil amb tints en color terracota.
- **Estats buits ('Empty states')**: Disseny específic i motivador quan no hi ha viatges registrats, guiant l'usuari amb una crida a l'acció (CTA) clara cap a la creació del seu primer viatge.
- **Gestió d'errors**: Notificació contextual dels errors de xarxa o de validació mitjançant components `Alert` / `HelperText`.

---

## 4. Veredicte Final

**APTE**. El mòdul de Viatges (`trips`) de la Fase 2 assoleix els estàndards establerts de qualitat visual, fidelitat als mockups aprovats, coherència en la paleta de colors terra de FELAG i una experiència d'usuari fluida i intuïtiva tant a la Web com a l'aplicació Mòbil.
