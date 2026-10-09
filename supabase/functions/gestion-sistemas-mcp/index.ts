import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@2.3.1'
import { pipeline } from 'npm:@supabase/middleware@0.6.0'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1.9.1'
import { z } from 'npm:zod@4.3.6'

type Perfil = {
  email: string
  nombre: string
  rol: 'admin' | 'gerencia' | 'bienestar' | 'consulta'
  activo: boolean
}

const jsonText = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
})

const OAUTH_SCHEMES = [{ type: 'oauth2' as const, scopes: ['email', 'profile'] }]
const READ_TOOL = {
  securitySchemes: OAUTH_SCHEMES,
  _meta: { securitySchemes: OAUTH_SCHEMES },
  annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
}
const WRITE_TOOL = {
  securitySchemes: OAUTH_SCHEMES,
  _meta: { securitySchemes: OAUTH_SCHEMES },
  annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
}
const PROFILE_TOOL = {
  ...READ_TOOL,
  _meta: { securitySchemes: OAUTH_SCHEMES, 'openai/profile': true },
}

const PRIORITY_LEGEND = {
  P1: 'Crítica',
  P2: 'Alta',
  P3: 'Normal',
  P4: 'Mejora',
}

const buildTaskTree = (tasks: any[] = []) => {
  const byParent = new Map<string | null, any[]>()
  for (const task of tasks) {
    const key = task.parent_task_id ?? null
    const list = byParent.get(key) ?? []
    list.push(task)
    byParent.set(key, list)
  }
  const build = (task: any): any => ({
    ...task,
    subtareas: (byParent.get(task.id) ?? []).map(build),
  })
  return (byParent.get(null) ?? []).map(build)
}

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    async (req, { supabase }) => {
      const getPerfil = async (): Promise<Perfil> => {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user?.email) throw new Error('No fue posible identificar el usuario autenticado.')

        const { data, error } = await supabase
          .from('accesos')
          .select('email,nombre,rol,activo')
          .eq('email', userData.user.email)
          .single()

        if (error || !data?.activo) throw new Error('Usuario no autorizado en Gestión Sistemas.')
        return data as Perfil
      }

      const requireAdmin = async () => {
        const perfil = await getPerfil()
        if (perfil.rol !== 'admin') throw new Error('Esta acción solo está permitida al administrador técnico.')
        return perfil
      }

      const resolverGrupoSolicitante = (
        perfil: Perfil,
        solicitado?: 'Gerente Laura' | 'Gerente Conny' | 'Jefes / Coordinadores' | 'Otras solicitudes',
      ) => {
        const email = perfil.email.toLowerCase()
        if (email === 'gerencia@campestrepereira.com') return 'Gerente Laura'
        if (email === 'gerenciaservicios@campestrepereira.com') return 'Gerente Conny'
        if (email === 'dirbienestar@campestrepereira.com') return 'Jefes / Coordinadores'
        if (email === 'diradministrativa@campestrepereira.com') return 'Jefes / Coordinadores'
        return solicitado ?? 'Otras solicitudes'
      }

      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'gestion-sistemas-cccp', version: '0.3.0' })

        server.registerTool('mi_perfil', {
          description: 'Devuelve el nombre, correo y rol del usuario conectado a Gestión Sistemas.',
          inputSchema: z.object({}),
        }, async () => jsonText(await getPerfil()))

        server.registerTool('consultar_trabajo_actual', {
          description: 'Consulta proyectos activos y tareas abiertas de Sistemas e Innovación. Úsalo para responder qué está trabajando Jhonnier actualmente.',
          inputSchema: z.object({ limite: z.number().int().min(1).max(50).default(20) }),
        }, async ({ limite }) => {
          const { data: proyectos, error: e1 } = await supabase
            .from('proyectos')
            .select('id,titulo,tipo_registro,categoria,subcategoria,estado,prioridad,porcentaje,solicitante,area_responsable,seguimiento,costo_proyecto,moneda,proveedor,numero_factura,fecha_factura,numero_cotizacion,fecha_objetivo,updated_at')
            .not('estado', 'in', '("Finalizado","Cancelado")')
            .order('destacado', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(limite)
          if (e1) throw new Error(e1.message)

          const { data: tareas, error: e2 } = await supabase
            .from('tareas')
            .select('id,proyecto_id,parent_task_id,titulo,descripcion,estado,prioridad,solicitante,grupo_solicitante,fecha_limite,created_at,updated_at')
            .not('estado', 'in', '("Finalizada","Cancelada")')
            .order('created_at', { ascending: false })
            .limit(limite)
          if (e2) throw new Error(e2.message)
          return jsonText({
            leyenda_prioridades: PRIORITY_LEGEND,
            proyectos,
            tareas_principales: (tareas ?? []).filter((t: any) => !t.parent_task_id),
            subtareas_abiertas: (tareas ?? []).filter((t: any) => !!t.parent_task_id),
          })
        })

        server.registerTool('buscar_proyectos', {
          description: 'Busca proyectos por texto y opcionalmente categoría o estado. Sirve para Red Piscina, ePayco, ZKTeco, FortiGate, Power BI o Horas Extras.',
          inputSchema: z.object({
            texto: z.string().min(1).max(120),
            categoria: z.string().max(80).optional(),
            estado: z.string().max(50).optional(),
            limite: z.number().int().min(1).max(50).default(20),
          }),
        }, async ({ texto, categoria, estado, limite }) => {
          let query = supabase
            .from('proyectos')
            .select('id,titulo,tipo_registro,categoria,subcategoria,descripcion,estado,prioridad,porcentaje,solicitante,area_responsable,seguimiento,costo_proyecto,moneda,proveedor,numero_factura,fecha_factura,numero_cotizacion,fecha_inicio,fecha_objetivo,fecha_cierre,github_url,onedrive_url,tags,updated_at')
            .or(`titulo.ilike.%${texto}%,descripcion.ilike.%${texto}%,subcategoria.ilike.%${texto}%`)
            .order('updated_at', { ascending: false })
            .limit(limite)
          if (categoria) query = query.eq('categoria', categoria)
          if (estado) query = query.eq('estado', estado)
          const { data, error } = await query
          if (error) throw new Error(error.message)
          return jsonText(data)
        })

        server.registerTool('consultar_proyecto', {
          description: 'Devuelve el detalle de un proyecto y todas sus tareas relacionadas. Puede localizarlo por ID o por parte del título.',
          inputSchema: z.object({
            id: z.string().uuid().optional(),
            titulo: z.string().min(2).max(140).optional(),
          }).refine((v) => v.id || v.titulo, { message: 'Indica id o titulo.' }),
        }, async ({ id, titulo }) => {
          let query = supabase.from('proyectos').select('*')
          if (id) query = query.eq('id', id)
          else query = query.ilike('titulo', `%${titulo}%`)
          const { data: proyectos, error } = await query.limit(5)
          if (error) throw new Error(error.message)
          const proyecto = proyectos?.[0]
          if (!proyecto) return jsonText({ encontrado: false, mensaje: 'Proyecto no encontrado.' })
          const { data: tareas, error: taskError } = await supabase
            .from('tareas').select('*').eq('proyecto_id', proyecto.id).order('created_at', { ascending: false })
          if (taskError) throw new Error(taskError.message)
          return jsonText({
            encontrado: true,
            proyecto,
            tareas: buildTaskTree(tareas ?? []),
            resumen: {
              tareas_principales: (tareas ?? []).filter((t: any) => !t.parent_task_id).length,
              subtareas: (tareas ?? []).filter((t: any) => !!t.parent_task_id).length,
            },
          })
        })

        server.registerTool('consultar_pendientes', {
          description: 'Consulta tareas pendientes. Permite filtrar por grupo solicitante, prioridad, proyecto o texto.',
          inputSchema: z.object({
            grupo_solicitante: z.enum(['Gerente Laura','Gerente Conny','Jefes / Coordinadores','Otras solicitudes']).optional(),
            prioridad: z.enum(['P1','P2','P3','P4']).optional(),
            proyecto_id: z.string().uuid().optional(),
            texto: z.string().max(120).optional(),
            incluir_subtareas: z.boolean().default(false),
            limite: z.number().int().min(1).max(100).default(40),
          }),
        }, async ({ grupo_solicitante, prioridad, proyecto_id, texto, incluir_subtareas, limite }) => {
          let query = supabase
            .from('tareas')
            .select('id,proyecto_id,parent_task_id,titulo,descripcion,estado,prioridad,solicitante,grupo_solicitante,origen,fecha_limite,created_by_email,created_at,updated_at')
            .not('estado', 'in', '("Finalizada","Cancelada")')
            .order('prioridad', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(limite)
          if (!incluir_subtareas) query = query.is('parent_task_id', null)
          if (grupo_solicitante) query = query.eq('grupo_solicitante', grupo_solicitante)
          if (prioridad) query = query.eq('prioridad', prioridad)
          if (proyecto_id) query = query.eq('proyecto_id', proyecto_id)
          if (texto) query = query.or(`titulo.ilike.%${texto}%,descripcion.ilike.%${texto}%,solicitante.ilike.%${texto}%`)
          const { data, error } = await query
          if (error) throw new Error(error.message)
          return jsonText({ leyenda_prioridades: PRIORITY_LEGEND, tareas: data })
        })

        server.registerTool('consultar_mis_tareas_creadas', {
          description: 'Consulta las tareas creadas por el usuario actualmente conectado a ChatGPT.',
          inputSchema: z.object({
            incluir_finalizadas: z.boolean().default(false),
            limite: z.number().int().min(1).max(100).default(50),
          }),
        }, async ({ incluir_finalizadas, limite }) => {
          const perfil = await getPerfil()
          let query = supabase.from('tareas').select('*').eq('created_by_email', perfil.email)
            .order('created_at', { ascending: false }).limit(limite)
          if (!incluir_finalizadas) query = query.not('estado', 'in', '("Finalizada","Cancelada")')
          const { data, error } = await query
          if (error) throw new Error(error.message)
          return jsonText(data)
        })

        server.registerTool('crear_tarea', {
          description: 'Crea una tarea principal o una subtarea para Jhonnier. Para crear una subtarea usa tarea_padre_id; el proyecto se hereda automáticamente de la tarea padre. Prioridades: P1=Crítica, P2=Alta, P3=Normal, P4=Mejora. Gerencia y el administrador pueden usarla. No cambia avances técnicos ni cierra proyectos.',
          inputSchema: z.object({
            titulo: z.string().min(3).max(140),
            descripcion: z.string().max(1500).optional(),
            prioridad: z.enum(['P1','P2','P3','P4']).default('P3'),
            grupo_solicitante: z.enum(['Gerente Laura','Gerente Conny','Jefes / Coordinadores','Otras solicitudes']).optional(),
            proyecto_id: z.string().uuid().optional(),
            tarea_padre_id: z.string().uuid().optional(),
            fecha_limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          }),
        }, async ({ titulo, descripcion, prioridad, grupo_solicitante, proyecto_id, tarea_padre_id, fecha_limite }) => {
          const perfil = await getPerfil()
          if (!['admin','gerencia','bienestar'].includes(perfil.rol)) throw new Error('Tu rol no tiene permiso para crear tareas.')
          const grupo_resuelto = resolverGrupoSolicitante(perfil, grupo_solicitante)

          let proyecto_resuelto = proyecto_id ?? null
          if (tarea_padre_id) {
            const { data: padre, error: padreError } = await supabase
              .from('tareas')
              .select('id,proyecto_id')
              .eq('id', tarea_padre_id)
              .single()
            if (padreError || !padre) throw new Error('La tarea padre indicada no existe.')
            if (proyecto_id && padre.proyecto_id !== proyecto_id) {
              throw new Error('La tarea padre no pertenece al proyecto indicado.')
            }
            proyecto_resuelto = padre.proyecto_id
          }

          const { data, error } = await supabase.from('tareas').insert({
            titulo, descripcion: descripcion ?? null, prioridad, grupo_solicitante: grupo_resuelto,
            proyecto_id: proyecto_resuelto, parent_task_id: tarea_padre_id ?? null,
            fecha_limite: fecha_limite ?? null,
            solicitante: perfil.nombre, origen: 'asistente',
          }).select('id,proyecto_id,parent_task_id,titulo,estado,prioridad,grupo_solicitante,fecha_limite,created_by_email,created_at').single()
          if (error) throw new Error(error.message)
          return jsonText({ creado: true, tarea: data })
        })

        server.registerTool('actualizar_tarea', {
          description: 'Actualiza estado, prioridad o descripción de una tarea. Acción exclusiva del administrador técnico Jhonnier.',
          inputSchema: z.object({
            id: z.string().uuid(),
            estado: z.enum(['Nueva','En analisis','Programada','En trabajo','En pruebas','Esperando informacion','Esperando proveedor','Finalizada','Cancelada']).optional(),
            prioridad: z.enum(['P1','P2','P3','P4']).optional(),
            descripcion: z.string().max(2000).optional(),
            fecha_limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
            tarea_padre_id: z.string().uuid().nullable().optional(),
          }),
        }, async ({ id, ...cambios }) => {
          await requireAdmin()
          const payload: Record<string, unknown> = { ...cambios }
          if ('tarea_padre_id' in cambios) {
            payload.parent_task_id = cambios.tarea_padre_id ?? null
            delete payload.tarea_padre_id
          }
          if (cambios.estado === 'Finalizada') payload.fecha_cierre = new Date().toISOString()
          const { data, error } = await supabase.from('tareas').update(payload).eq('id', id).select().single()
          if (error) throw new Error(error.message)
          return jsonText({ actualizado: true, tarea: data })
        })

        server.registerTool('actualizar_proyecto', {
          description: 'Actualiza avance, estado o descripción de un proyecto. Acción exclusiva del administrador técnico Jhonnier.',
          inputSchema: z.object({
            id: z.string().uuid(),
            estado: z.enum(['Nuevo','En analisis','Programado','En trabajo','En pruebas','En seguimiento','Esperando informacion','Esperando proveedor','Pausado','Finalizado','Cancelado']).optional(),
            porcentaje: z.number().int().min(0).max(100).optional(),
            descripcion: z.string().max(3000).optional(),
            prioridad: z.enum(['P1','P2','P3','P4']).optional(),
            area_responsable: z.string().max(100).optional(),
            seguimiento: z.array(z.string().max(100)).max(10).optional(),
            costo_proyecto: z.number().nonnegative().optional(),
            moneda: z.enum(['COP','USD']).optional(),
            proveedor: z.string().max(160).optional(),
            numero_factura: z.string().max(120).nullable().optional(),
            fecha_factura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
            numero_cotizacion: z.string().max(120).nullable().optional(),
          }),
        }, async ({ id, ...cambios }) => {
          await requireAdmin()
          const payload: Record<string, unknown> = { ...cambios }
          if (cambios.estado === 'Finalizado') {
            payload.fecha_cierre = new Date().toISOString().slice(0, 10)
            if (cambios.porcentaje === undefined) payload.porcentaje = 100
          }
          const { data, error } = await supabase.from('proyectos').update(payload).eq('id', id).select().single()
          if (error) throw new Error(error.message)
          return jsonText({ actualizado: true, proyecto: data })
        })

        server.registerTool('desarrollos_realizados', {
          description: 'Lista los desarrollos realizados y sus enlaces públicos para un año. No expone la configuración técnica del repositorio a Gerencia.',
          inputSchema: z.object({ anio: z.number().int().min(2020).max(2100).default(2026) }),
        }, async ({ anio }) => {
          const { data, error } = await supabase.from('repositorios_github')
            .select('nombre,descripcion,public_url,fecha_creacion_github,anio')
            .eq('visible', true).eq('anio', anio).order('fecha_creacion_github', { ascending: true })
          if (error) throw new Error(error.message)
          return jsonText(data)
        })

        server.registerTool('consultar_historial', {
          description: 'Consulta los movimientos recientes del sistema para trazabilidad.',
          inputSchema: z.object({ limite: z.number().int().min(1).max(100).default(30) }),
        }, async ({ limite }) => {
          const { data, error } = await supabase.from('historial')
            .select('id,proyecto_id,tarea_id,accion,detalle,actor_email,created_at')
            .order('created_at', { ascending: false }).limit(limite)
          if (error) throw new Error(error.message)
          return jsonText(data)
        })

        return server
      })

      return handler.fetch(req)
    },
  ),
)
