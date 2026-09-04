# Especificació funcional — Mòdul Administració, Mètriques i Auditoria (`admin-metrics`) (v0.7.0)

**Versió**: 0.7.0  
**Estat**: En revisió (Pendent de validació humana - Checkpoint 1)  
**Data**: 2026-09-04  
**Accés**: Restringit **exclusivament a usuaris amb rol `admin`**  

---

## 1. Objectiu del Mòdul

El mòdul **Administració & Mètriques (`admin-metrics`)** proporciona a l'equip administrador de FELAG una consola integral d'observabilitat, mètriques d'ús i negoci de la comunitat, registre d'auditoria en temps real (qui fa què) i safata de moderació de denúncies, mantenint la capacitat de l'administrador d'utilitzar l'aplicació com a viatger estàndard.

---

## 2. Èpiques i Històries d'Usuari

### Èpica 1: Registre d'Auditoria & Observabilitat d'Ús (Qui fa què)
- **HU-ADM-01 (Middleware d'Auditoria Asíncron)**: Registre no bloquejant mitjançant Middleware de Gin de cada petició a l'API a la taula `audit_logs` (`user_id`, `user_email`, `user_role`, `action`, `module`, `endpoint`, `method`, `status_code`, `duration_ms`, `ip_address`, `user_agent`, `timestamp`).
- **HU-ADM-02 (Cerca, Filtre i Paginació d'Auditoria)**: L'Administrador pot cercar per usuari o endpoint, filtrar per mòdul (`auth`, `trips`, `matching`, `chat`, `community`, `posttrip`) i per codi HTTP (2xx, 4xx, 5xx).
- **HU-ADM-03 (Exportació d'Auditoria a CSV)**: Descàrrega directa del registre complet d'auditoria en fitxer `.csv` per a anàlisi externa.

### Èpica 2: Rendiment d'API & Salut de la Infraestructura
- **HU-ADM-04 (Mètriques de Rendiment d'API)**: Latència mitjana, `p95` i `p99` per endpoint, taxa d'errors i rànquing d'endpoints més concorreguts / més lents.
- **HU-ADM-05 (Salut del Servidor & DB)**: Uptime del servidor Go, nombre de goroutines actives, consum de memòria RAM, connexions actives al pool de PostgreSQL i clients WebSocket de xat connectats en temps real.

### Èpica 3: Mètriques de Negoci & Comunitat FELAG
- **HU-ADM-06 (KPIs de Comunitat & Matching)**:
  - Viatges totals, viatges actius en curs i rànquing de destinacions més visitades.
  - Coincidències (matches) generades per nivell d'afinitat (Poble, Comarca/Regió, País).
  - Volum de converses de xat iniciades i Celebration Cards creades.
  - Recomanacions de destinació per categoria i vots útils acumulats.

### Èpica 4: Moderació de Contingut & Denúncies
- **HU-ADM-07 (Safata de Moderació)**: Panell centralitzat de denúncies d'usuaris (`user_reports`) i de contingut comunitari (`community_reports`) amb accions de resolució (*Aprovar/Ignorar* o *Bloquejar contingut/usuari*).

---

## 3. Normes de Negoci i Seguretat (RBAC)

1. **Jerarquia de Rols**:
   - `admin`: Superconjunt de permisos. Pot viatjar, xatejar i utilitzar FELAG normalment, i a més té accés exclusiu a `/admin` i `/api/v1/admin/*`.
   - `user`: Usuari estàndard. Qualsevol intent d'accedir a `/api/v1/admin/*` rep un `403 Forbidden`.
2. **Middleware Asíncron**: L'enregistrament d'auditoria s'executa en segon pla (goroutines a Go) per no penalitzar la latència de les respostes.
3. **Persistència**: Totes les dades es guarden a PostgreSQL amb índexs dedicats per a consultes ultra-ràpides.

---

## 4. Esquema de Dades (PostgreSQL)

```sql
-- Migració 000008: Creació de taules d'auditoria i mètriques
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    duration_ms INT NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON audit_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
```
