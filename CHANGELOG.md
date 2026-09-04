# Changelog — FELAG

Tots els canvis rellevants d'aquest projecte seran documentats en aquest fitxer.
El format està basat en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
i aquest projecte adhereix a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-09-04

### Added
- **Mòdul d'Administració, Mètriques, Auditoria d'Ús & Moderació (`admin-metrics`)**:
  - **Model d'Admin Inclusiu & Seguretat RBAC**: L'administrador és un usuari complet (perfil territorial, viatges, trobades) amb accés addicional a la consola `/admin` i protecció al backend via `RequireAdmin()`.
  - **Middleware d'Auditoria Asíncron (`MetricsMiddleware`)**: Captura automàtica en segon pla de cada petició a l'API a la taula `audit_logs` (usuari, acció, mòdul, ruta, codi HTTP, durada en ms, IP i dispositiu) sense penalitzar la latència.
  - **Consola Dashboard d'Administració (`AdminDashboardView`) amb 4 pestanyes**:
    - 📊 **Comunitat & Negoci**: Targetes KPI de viatges en curs i totals, distribució de matches per nivell d'afinitat territorial (poble, comarca/regió, país), trobades celebrades i rànquing de destinacions més visitades.
    - ⚡ **Rendiment API & Salut de la Infraestructura**: Latències p95, p99 i mitjana per endpoint, taxa d'errors, connexions WebSockets en directe, consum de memòria RAM, goroutines i estat del pool de PostgreSQL.
    - 📜 **Registre d'Auditoria (Audit Log)**: Taula interactiva en viu de qui fa què, amb filtres per mòdul, cerca per usuari/ruta, codi HTTP i botó de **descàrrega directa del registre en CSV**.
    - 🛡️ **Safata de Moderació & Denúncies**: Panell centralitzat per gestionar reports d'usuaris i de contingut amb accions ràpides (*Ignorar*, *Eliminar contingut*, *Sancionar*).
  - **Base de dades**: Migració `000008_create_audit_and_metrics.up.sql` amb taula `audit_logs`, índexs de rendiment i columna `role` a `users`.
  - **Informes**: Validació de qualitat a [qa-reports/admin-metrics.md](file:///Users/eric.zapater/Developer/felag/qa-reports/admin-metrics.md) (APTE) i d'experiència d'usuari a [ux-reports/admin-metrics.md](file:///Users/eric.zapater/Developer/felag/ux-reports/admin-metrics.md) (APTE).

## [0.6.0] - 2026-09-03

### Added
- **Fase 6 — Post-Trip Experience: Celebration, Feedback & Exploration**:
  - Hub de Viatge Actiu, Àlbum de fotos del viatge (`trip_photos`), Celebration Cards en temps real, Ritual de tancament, Reportatge 9:16 per a Instagram Stories i Exploració de Destinacions.

## [0.5.0] - 2026-09-03

### Added
- **Fase 5 — Community Knowledge & Real-Time Moments**.

## [0.4.0] - 2026-09-03

### Added
- **Fase 4 — FELAG Connect (Xat xifrat AES-256-GCM, WebSockets, Perfils Públics i Moderació)**.

## [0.3.0] - 2026-09-03

### Added
- **Fase 3 — FELAG Matching & Notificacions Push (Event-Driven)**.

## [0.2.0] - 2026-09-03

### Added
- **Fase 2 — Viatges (`trips`) multietapa**.

## [0.1.0] - 2026-09-03

### Added
- **Fase 0 — Fundació** i **Fase 1 — Identitat & Orígens**.
