# Modelo de Gestión — Sistemas e Innovación CCCP

## Objetivo

Gestión Sistemas es la bitácora profesional y centro de trazabilidad del trabajo de Sistemas e Innovación. No es una mesa de ayuda general del Club.

Solo registra trabajo que realmente corresponde a la gestión de Jhonnier y que debe tener seguimiento.

## Niveles de información

### 1. Proyecto

Trabajo con objetivo y entregable definido.

Ejemplos:
- Sistema de Turnos y Horas Extras
- Red Piscina
- ePayco / Prosof / Tokenización
- Fiesta Blanco y Negro 2026
- Centro de Control Gestión Sistemas

Puede tener:
- estado
- prioridad
- avance
- fecha objetivo
- tareas derivadas
- documentación
- repositorio GitHub

### 2. Frente operativo

Área de trabajo permanente o recurrente que agrupa casos concretos. No implica un único entregable con fecha de cierre.

Ejemplos:
- Cableado y puntos de red
- Incidentes de red y fibra
- VLAN y switches
- FortiGate / FortiPortal / Tigo
- Modificaciones APP del Club

Los casos concretos dentro de estos frentes se registran como tareas.

### 3. Tarea / solicitud

Acción concreta que debe ejecutarse, revisarse o seguirse.

Puede originarse en:
- ChatGPT
- Dashboard
- Correo
- Proyecto
- Reunión / Teams (fase posterior)

Estados:
- Nueva
- En análisis
- Programada
- En trabajo
- En pruebas
- Esperando información
- Esperando proveedor
- Finalizada
- Cancelada

### 4. Historial

Toda creación y modificación importante debe quedar registrada con fecha y actor.

### 5. Desarrollos realizados

Inventario de productos/desarrollos entregados y sus repositorios GitHub. Es un histórico, no una lista de pendientes.

## Prioridades oficiales

- P1 — Crítica: caída de servicio, pagos, seguridad, red/acceso crítico o impacto general.
- P2 — Alta: bloquea un área o requiere atención prioritaria.
- P3 — Normal: trabajo operativo ordinario.
- P4 — Mejora: optimización, idea o evolución sin urgencia.

El cargo de quien solicita no convierte automáticamente una tarea en P1.

## Estados resumidos para Gerencia

### En trabajo ahora
- En trabajo
- En pruebas

### En seguimiento / espera
- En seguimiento
- Esperando información
- Esperando proveedor
- Programado
- Pausado

### Cerrado
- Finalizado
- Cancelado

## Correo y reuniones

Outlook y Teams son canales de entrada.

Regla:
1. El asistente revisa correo/reunión.
2. Determina si existe una solicitud concreta relacionada con Sistemas e Innovación.
3. Busca si ya existe en Gestión Sistemas.
4. Si existe, actualiza o vincula el contexto.
5. Si es claramente una nueva responsabilidad, crea una tarea.
6. Si es ambiguo, no crea un registro automáticamente y lo presenta para revisión.
7. Correos informativos, notificaciones automáticas y asuntos fuera de alcance no ingresan.

Toda tarea creada desde un correo o reunión debe conservar la referencia de origen.

## Permisos

### Jhonnier — Administrador
- consulta completa
- creación
- actualización técnica
- cambio de estado/avance
- cierre

### Gerencia
- consulta completa
- creación de solicitudes
- definición de prioridad
- comentarios/seguimiento
- sin cierre técnico de proyectos
- sin modificación del avance técnico

Usuarios autorizados actuales:
- analistainnovacion@campestrepereira.com — Administrador
- gerencia@campestrepereira.com — Gerencia
- gerenciaservicios@campestrepereira.com — Gerencia
- diradministrativa@campestrepereira.com — Gerencia
- dirbienestar@campestrepereira.com — Gerencia

## Interfaz principal

El uso diario puede hacerse desde ChatGPT mediante Gestión Sistemas CCCP.

Ejemplos:
- ¿Qué está trabajando Jhonnier?
- ¿Qué está esperando de proveedores?
- ¿Cómo va Red Piscina?
- Muéstrame las tareas pendientes de Horas Extras.
- Crea una tarea para revisar el WiFi de Eventos, prioridad P2.

El dashboard web funciona como vista visual y administrativa del mismo conjunto de datos.


## Reglas de asociación por Gerencia

### Laura
Todo lo relacionado con infraestructura de red queda asociado a Gerente Laura:
- Tigo UNE
- Media Commerce
- FortiGate / FortiPortal
- fibra
- racks
- switches
- VLAN
- puntos de datos / puntos de red
- cableado estructurado
- módulos SFP
- proyectos de conectividad

El solicitante original puede conservarse como referencia, pero el grupo de seguimiento gerencial es `Gerente Laura`.

### Conny / Gerencia Servicios
Las tareas de módulos de la App asignadas por Gerencia Servicios se agrupan en `Gerente Conny` y, cuando corresponda, se vinculan al frente `Modificaciones APP del Club`.

## Regla para facturas y cotizaciones de proyectos

- Factura de un proyecto aprobado: registrar el proyecto y marcarlo como `Finalizado`, salvo que Jhonnier indique expresamente que aún sigue en ejecución.
- Cotización / propuesta: registrar el proyecto como `En análisis` o `En seguimiento` y mantenerlo abierto hasta que Jhonnier confirme su cierre.
- Si una cotización posteriormente tiene factura, actualizar el mismo proyecto; no crear un duplicado.

## OneDrive / SharePoint

La documentación de proyectos se enlaza desde el campo `onedrive_url`.

OneDrive se integra mediante el complemento Microsoft SharePoint, que usa Microsoft Graph y puede acceder a OneDrive y bibliotecas de SharePoint del usuario autenticado.

No se duplican los archivos en Supabase. Gestión Sistemas guarda el enlace a la carpeta o documento correspondiente.


## Jerarquía de proyectos

Un proyecto no se divide en múltiples proyectos pequeños cuando forman parte del mismo entregable.

Estructura oficial:

Proyecto
- Tarea principal
  - Subtarea
  - Subtarea
- Tarea principal
  - Subtarea

Ejemplo: Sistema de Turnos y Horas Extras
- Área responsable: Bienestar
- Seguimiento: Laura Palacio y Bienestar
- Horas Extras y Nómina
  - reglas de nocturnas
  - aprobación por corte
  - descuentos de almuerzo
- Marcaciones y BioTime
  - ZKTeco
  - Portería
  - marcaciones sin programación
- PWA Mis Turnos y notificaciones
  - notificaciones con app cerrada
  - persistencia tras actualizaciones
  - avisos bidireccionales
- Exportes y reportes
  - PROSOF
  - exportes individuales
- Programación por áreas
  - Mantenimiento

Regla: casos como exportes individuales, ajustes de la PWA, notificaciones o validaciones no se crean como proyectos nuevos; se registran como tareas o subtareas del proyecto principal.


## Ingesta documental de proyectos (facturas y cotizaciones)

Reglas oficiales para procesar PDFs de proveedores:

### Clasificación por proveedor
- Todo documento/proyecto de **Fredy Flores** se clasifica como **Redes e infraestructura** y se asocia a **Gerente Laura**.
- Todo documento/proyecto de **TekSoluciones / Tek Soluciones** se clasifica como **Redes e infraestructura** y se asocia a **Gerente Laura**.
- Estas reglas prevalecen sobre la descripción técnica puntual del documento.

### Facturas
Una factura confirma que el proyecto fue aprobado/ejecutado.

Al encontrar una factura:
- crear o actualizar un único proyecto;
- estado: **Finalizado**;
- avance: **100 %**;
- registrar proveedor;
- registrar número y fecha de factura;
- registrar **costo del proyecto**;
- moneda: COP salvo que el documento indique otra;
- si existe cotización correspondiente, no crear otro proyecto por la cotización;
- conservar la referencia de cotización en el mismo proyecto cuando pueda relacionarse.

### Cotizaciones
Si existe una cotización pero no una factura asociada:
- no afirmar que el proyecto fue implementado;
- registrar el proyecto como **En análisis** o **En seguimiento**;
- avance: 0 % salvo evidencia adicional;
- registrar número de cotización y proveedor;
- no marcar como Finalizado;
- la ausencia de factura puede significar que el proyecto no se implementó, sigue pendiente o finalmente se ejecutó con otro proveedor.

### Deduplicación factura/cotización
Para decidir si factura y cotización corresponden al mismo proyecto se comparan, en este orden:
1. proveedor;
2. número de cotización/factura y referencias cruzadas;
3. descripción/alcance;
4. sede/área/equipos;
5. fechas;
6. valores.

Si hay coincidencia razonable, se mantiene un solo proyecto y la factura tiene precedencia sobre la cotización.

### Costo visible
Los proyectos pueden almacenar:
- `costo_proyecto`
- `moneda`
- `proveedor`
- `numero_factura`
- `fecha_factura`
- `numero_cotizacion`

El costo debe mostrarse directamente en la tarjeta del proyecto para facilitar lectura gerencial.
