# UX — Mòduls Autenticació (`auth`) i Perfil (`profile`)

**Veredicte**: **APTE**  
**Data**: 2026-09-03

---

## Fluxos revisats
- **Login & Registre (Web & Mòbil)**: Flux ràpid i directe amb inputs amples i feedback visual clar en cas d'error.
- **Perfil & Edició (Web & Mòbil)**: Presentació clara de la informació personal, camp dedicat per al telèfon de verificació MFA, i visualització destaquada de l'origen.
- **Selecció d'Origen (Web & Mòbil)**: Selecció en 3 passos guiats (País → Regió → Ciutat) amb resum visual en caixa d'estil sorra.

---

## Eixos de revisió

1. **Usabilitat**:
   - [OK] La selecció d'origen guia l'usuari en 3 nivells consecutius i s'evita la confusió d'entrada lliure.
   - [OK] Els camps de telèfon per a MFA tenen la seva pròpia indicació d'ajuda.

2. **Fidelitat als mockups aprovats**:
   - [OK] La implementació Web (MUI) i Mòbil (React Native Paper) respecta l'estructura, la disposició i els elements aprovats als mockups de `mockups/auth/` i `mockups/profile/`.

3. **Consistència visual (Paleta de colors terra)**:
   - [OK] Aplicació consistent dels colors terra:
     - Color primari d'acció (Terracota `#C85A32`).
     - Fons de pàgina/pantalla (Crema `#F9F6F0`).
     - Fons de caixes i destacats d'origen (Sorra `#F4ECE1`).
     - Textos principals i fons de marc mòbil (Marró terra fosca `#3E2723` / `#2C221E`).

4. **Responsive / Mòbil**:
   - [OK] Adaptació perfecta als marcs de dispositiu mòbil (~375px) i vistes d'escriptori.

5. **Feedback a l'usuari**:
   - [OK] Missatges d'èxit ("Perfil actualitzat amb èxit!", "Origen guardat!") i indicadors de càrrega als botons durant la petició.

6. **Accessibilitat bàsica**:
   - [OK] Contrast de color adequat entre el fons crema/sorra i els textos foscos, i mides de botó d'accés tàctil (>44px).
