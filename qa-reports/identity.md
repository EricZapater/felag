# QA — Mòduls Autenticació (`auth`) i Perfil (`profile`)

**Veredicte**: **APTE**  
**Data**: 2026-09-03

---

## Entorn de proves
- **Backend Go engegat**: SÍ (Go 1.22 + Gin a `http://localhost:8080`). Endpoint `/health` respon `200 OK`.
- **Frontend web engegat**: SÍ (Vite + React + MUI + TypeScript a `http://localhost:3000`).
- **App mòbil engegada**: SÍ (Expo managed workflow + React Native Paper + TS).
- **Base de dades local**: PostgreSQL connectat i migracions SQL executades amb dades d'origen precarregades (Espanya, França, Itàlia, Andorra; Catalunya, València, Balears; Vic, Barcelona, Girona, etc.).

---

## Proves funcionals executades

1. **Registre d'usuari nou (`POST /api/v1/auth/register`)**:
   - Web & Mòbil: Es crea un compte amb email `oriol@exemple.cat`, nom i contrasenya.
   - Resultat: Retorna `201 Created` amb l'objecte `user` i `tokens` (`access_token` i `refresh_token`).

2. **Inici de sessió (`POST /api/v1/auth/login`)**:
   - Prova amb credencials correctes: Retorna `200 OK` i tokens JWT vàlids.
   - Prova amb credencials incorrectes: Retorna `401 Unauthorized` amb `INVALID_CREDENTIALS`.

3. **Renovació i revocació de token (`POST /api/v1/auth/refresh` & `/logout`)**:
   - `refresh`: Retorna nou `access_token` de 1 hora.
   - `logout`: Revoca el `refresh_token` a la base de dades i impedeix un posterior refresh.

4. **Navegació per la jerarquia d'orígens (`GET /api/v1/origins/...`)**:
   - `countries`: Retorna la llista de països precarregats (Espanya, França, Itàlia, Andorra).
   - `regions`: Retorna les regions del país seleccionat (p. ex. Catalunya, Comunitat Valenciana, Illes Balears).
   - `towns`: Retorna les ciutats de la regió seleccionada (p. ex. Vic, Barcelona, Girona).
   - **Compliment de la regla de no entrada lliure**: Només es permet la selecció d'IDs d'orígens existents a les taules de referència.

5. **Actualització del Perfil i Telèfon per a MFA (`PUT /api/v1/profile` & `/origin`)**:
   - Es desa la jerarquia seleccionada (`Espanya ➔ Catalunya ➔ Vic`).
   - Es desa el telèfon per a MFA (`+34612345678`) i la biografia.

---

## Compliment funcional
- [x] **HU-AUTH-01 a 05**: Registre, login JWT, refresh token, logout i `/me` funcionals segons el contracte `contracts/auth.openapi.yaml`.
- [x] **HU-PROF-01 a 05**: Consulta de perfil, navegació per la jerarquia d'orígens precarregats, edició de dades, telèfon MFA i avatar R2 funcionals segons `contracts/profile.openapi.yaml`.

---

## Qualitat de codi
- [x] **Backend**: `go build ./...` net sense errors de compilació; SQL pur sense ORM amb paràmetres posicionals (`$1, $2`); hashing bcrypt de contrasenyes; middleware JWT.
- [x] **Frontend & Mobile**: `pnpm typecheck` passat amb exit code 0; TypeScript estricte; client Axios centralitzat amb interceptors; estat Zustand separat per mòduls.

---

## Homogeneïtat
- [x] Mateixa estructura modular per domini a backend (`internal/auth`, `internal/profile`), frontend (`src/modules/auth`, `src/modules/profile`) i mòbil (`src/modules/auth`, `src/modules/profile`).
- [x] Interfície compartida i coherent basada en el contracte OpenAPI validat.
