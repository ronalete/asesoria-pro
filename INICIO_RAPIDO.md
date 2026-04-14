# AsesorIA Pro · Inicio Rápido

## Requisitos previos
- PostgreSQL corriendo (servicio: `postgresql-x64-18`)
- Node.js instalado
- API key de Anthropic en `backend/.env`

---

## Arrancar el proyecto

Abre **dos terminales PowerShell 7** (o dos pestañas en Windows Terminal).

### Terminal 1 — Backend
```powershell
cd C:\asesoria-pro\backend
npm run start:dev
```
Listo cuando aparezca: `Nest application successfully started`
URL: http://localhost:3000/api/v1

### Terminal 2 — Frontend
```powershell
cd C:\asesoria-pro\frontend\asesoria-frontend
npm start
```
Listo cuando aparezca: `Application bundle generation complete`
URL: http://localhost:4200

---

## Si PostgreSQL no está corriendo

```powershell
# Verificar estado
Get-Service -Name 'postgresql*' | Select-Object Name, Status

# Iniciar si está detenido
Start-Service -Name 'postgresql*'
```

---

## Base de datos
| Campo    | Valor           |
|----------|-----------------|
| Host     | localhost        |
| Puerto   | 5432            |
| DB       | asesoria_ia_db  |
| Usuario  | asesoria_user   |
| Password | asesoria123     |

---

## Estructura del proyecto
```
C:\asesoria-pro\
├── backend\                  ← NestJS (puerto 3000)
│   ├── src\
│   │   ├── claude\           ← ClaudeService (Anthropic SDK)
│   │   ├── formulador\       ← Agente principal
│   │   ├── documentos\
│   │   └── solicitudes\
│   └── .env                  ← API key de Anthropic aquí
│
└── frontend\asesoria-frontend\ ← Angular (puerto 4200)
    └── src\app\
        ├── features\dashboard\   ← Dashboard principal
        ├── componentes\
        │   ├── formulador\       ← Flujo de proyectos
        │   └── chatbot\          ← Chat con IA
        └── servicios\
            └── formulador.ts     ← Servicio HTTP
```

---

## Endpoints principales (backend)
```
GET    /api/v1/solicitudes
POST   /api/v1/solicitudes
GET    /api/v1/solicitudes/estadisticas

POST   /api/v1/formulador
GET    /api/v1/formulador
GET    /api/v1/formulador/:id
POST   /api/v1/formulador/:id/analizar
GET    /api/v1/formulador/:id/preguntas
PUT    /api/v1/formulador/:id/respuestas
POST   /api/v1/formulador/:id/formular
GET    /api/v1/formulador/:id/exportar/word
GET    /api/v1/formulador/:id/exportar/pdf

POST   /api/v1/documentos/subir
POST   /api/v1/claude/chat
```

---

## Notas importantes
- El shell **bash integrado de Claude Code** tiene problemas de fork en este equipo. Usar siempre **PowerShell 7** para ejecutar comandos.
- Los comandos en PowerShell van **separados**, no encadenados con `&&` en una sola línea desde el chat.
- El modelo IA usado es `claude-sonnet-4-6` configurado en `backend/.env`.
