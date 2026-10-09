# Configuración ChatGPT + Gestión Sistemas

## Arquitectura

ChatGPT -> Plugin/App MCP -> Supabase Edge Function -> RLS -> PostgreSQL

Endpoint MCP:

`https://ejcspbaiksjuvbkxrkpe.supabase.co/functions/v1/gestion-sistemas-mcp`

## Usuarios autorizados

- analistainnovacion@campestrepereira.com — Administrador
- gerencia@campestrepereira.com — Gerencia
- gerenciaservicios@campestrepereira.com — Gerencia
- diradministrativa@campestrepereira.com — Gerencia
- dirbienestar@campestrepereira.com — Gerencia

## Permisos

### Administrador
Puede consultar, crear tareas, actualizar tareas, actualizar proyectos y cerrar trabajo.

### Gerencia
Puede consultar toda la gestión y crear tareas. No puede cambiar avances técnicos ni cerrar proyectos.

## Herramientas MCP

- `mi_perfil`
- `consultar_trabajo_actual`
- `buscar_proyectos`
- `consultar_proyecto`
- `consultar_pendientes`
- `consultar_mis_tareas_creadas`
- `crear_tarea`
- `actualizar_tarea` — admin
- `actualizar_proyecto` — admin
- `desarrollos_realizados`
- `consultar_historial`

## Publicación web

El repositorio incluye un workflow de GitHub Pages.

En GitHub:

1. Settings > Pages.
2. Source: GitHub Actions.
3. Ejecutar el workflow `Deploy GitHub Pages`.

URL prevista:

`https://mrprogramer1997.github.io/Gesti-n-Sistemas/`

## Supabase Auth para OAuth MCP

En Supabase > Authentication:

### URL Configuration

- Site URL: `https://mrprogramer1997.github.io`
- Additional Redirect URL: `https://mrprogramer1997.github.io/Gesti-n-Sistemas/**`

### OAuth Server

1. Enable OAuth 2.1 Server.
2. Authorization Path: `/Gesti-n-Sistemas/oauth-consent.html`
3. Enable Dynamic Client Registration.
4. Mantener consentimiento explícito del usuario.

### JWT Signing Keys

Usar una llave asimétrica ES256 o RS256 para que el MCP pueda verificar tokens mediante JWKS.

## Conectar en ChatGPT

1. Abrir ChatGPT > Plugins.
2. Agregar > Add custom MCP server.
3. Nombre: `Gestión Sistemas CCCP`.
4. Server URL:
   `https://ejcspbaiksjuvbkxrkpe.supabase.co/functions/v1/gestion-sistemas-mcp`
5. Configurar autenticación OAuth.
6. Completar la autorización con el correo institucional.
7. Probar con:
   - ¿Qué está trabajando Jhonnier actualmente?
   - ¿Qué tareas están pendientes?
   - ¿Cómo va el proyecto de Horas Extras?
   - Créale a Jhonnier una tarea para revisar el WiFi de Eventos, prioridad alta.

Después de validarlo, crear/compartir el plugin con el espacio de trabajo para Laura, Conny, Carolina y Jhonnier.
