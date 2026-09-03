# Especificació de Mòdul: Autenticació (`auth`)

Aquest document defineix les històries d'usuari i criteris d'acceptació per al mòdul d'autenticació (`auth`).

---

## Històries d'Usuari

### HU-AUTH-01: Registre d'Usuari Nou
**Com a** nou usuari de FELAG,
**Vull** crear un compte introduint el meu correu electrònic, contrasenya i nom complet,
**Per tal de** poder accedir a l'aplicació i configurar el meu perfil i els meus viatges.

**Criteris d'Acceptació**:
- L'usuari ha de proporcionar:
  - Email (vàlid, únic en el sistema).
  - Password (mínim 8 caràcters, almenys una lletra i un número).
  - Nom complet.
- Si el correu ja existeix, es retorna un error de conflicte (409 Conflict) amb missatge clar.
- La contrasenya s'emmagatzema a la base de dades utilitzant un algorisme de hashing segur (bcrypt/argon2).
- En registrar-se amb èxit, es crea l'usuari i es retornen els tokens d'accés (JWT) i el perfil bàsic de l'usuari.

---

### HU-AUTH-02: Inici de Sessió (Login)
**Com a** usuari registrat,
**Vull** iniciar sessió amb el meu email i contrasenya,
**Per tal d'** obtenir les meves credencials d'accés (tokens JWT) i utilitzar la plataforma des de la web o l'app mòbil.

**Criteris d'Acceptació**:
- L'usuari introdueix email i contrasenya.
- Si les credencials són vàlides:
  - Es genera un **Access Token JWT** (caducitat curtau, p. ex. 15 min / 1h).
  - Es genera un **Refresh Token JWT** (caducitat llarga, p. ex. 30 dies).
  - Es retorna la resposta amb els tokens i les dades bàsiques de l'usuari (ID, nom, email).
- Si les credencials són invàlides (email no trobat o contrasenya errònia), es retorna un 401 Unauthorized amb el codi `INVALID_CREDENTIALS` sense revelar si ha fallat l'email o la contrasenya.

---

### HU-AUTH-03: Renovació de Token (Refresh Token)
**Com a** client (web o mòbil) amb un Access Token caducat,
**Vull** demanar un nou Access Token enviant el Refresh Token vàlid,
**Per tal de** mantenir la meva sessió activa sense haver de tornar a introduir la contrasenya.

**Criteris d'Acceptació**:
- L'endpoint rep el `refresh_token`.
- Si el Refresh Token és vàlid i no ha caducat ni estat revocat, es genera un nou Access Token i es retorna.
- Si el Refresh Token és invàlid o ha caducat, es retorna un 401 Unauthorized i l'usuari ha de tornar a fer login.

---

### HU-AUTH-04: Tancament de Sessió (Logout)
**Com a** usuari autenticat,
**Vull** tancar la meva sessió,
**Per tal de** revocar els tokens actius i assegurar el meu compte en el dispositiu actual.

**Criteris d'Acceptació**:
- L'endpoint rep la petició d'un usuari autenticat.
- El Refresh Token associat es marca com a revocat / invalidat a la base de dades.
- El client elimina els tokens emmagatzemats localment.

---

### HU-AUTH-05: Consulta de Sessió Actual (`/me`)
**Com a** client (web o mòbil),
**Vull** consultar la informació de l'usuari autenticat actual,
**Per tal de** rehidratar l'estat de l'aplicació en arrencar.

**Criteris d'Acceptació**:
- Si el token JWT d'accés és vàlid a la capçalera `Authorization: Bearer <token>`, es retornen les dades bàsiques de l'usuari.
- Si el token és invàlid o ha caducat, es retorna un 401 Unauthorized.
