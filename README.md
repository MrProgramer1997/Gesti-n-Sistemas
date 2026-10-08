# Gestión Sistemas — Club Campestre de Pereira

Centro de Control de Sistemas e Innovación para trazabilidad de proyectos, solicitudes, redes y desarrollos.

## Arquitectura

- Frontend estático: GitHub Pages
- Base de datos y autenticación: Supabase `Gestión Sistemas`
- Proyecto Supabase: `ejcspbaiksjuvbkxrkpe`
- RLS habilitado en todas las tablas públicas
- Roles: `admin`, `gerencia`, `consulta`

## Permisos

- **admin**: consulta completa, creación y actualización técnica de proyectos/tareas.
- **gerencia**: consulta completa y creación de tareas con prioridad.
- **consulta**: lectura.

Los usuarios deben existir en Supabase Auth y también en la tabla `accesos`.

## Datos iniciales

La base incluye el inventario 2026 de redes, desarrollos e integraciones del Club, tareas derivadas de Turnos/Horas Extras y los repositorios GitHub institucionales creados durante 2026.

## Próximas integraciones

1. OneDrive / SharePoint para documentación.
2. Outlook para registrar solicitudes aprobadas.
3. Asistente conversacional para crear, actualizar y consultar proyectos.
4. Notificaciones y seguimiento de fechas límite.
