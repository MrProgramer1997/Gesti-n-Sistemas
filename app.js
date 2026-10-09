import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.1";

const SUPABASE_URL = "https://ejcspbaiksjuvbkxrkpe.supabase.co";
const SUPABASE_KEY = "sb_publishable_6nNZwtjkoAezvbxx-m2y8A_VoJTDP5H";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const state = { session:null, access:null, projects:[], tasks:[], repos:[], history:[], view:"inicio", search:"" };
const $ = (s) => document.querySelector(s);
const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const fmt = (d) => d ? new Intl.DateTimeFormat("es-CO",{dateStyle:"medium",timeStyle:String(d).includes("T")?"short":undefined}).format(new Date(d)) : "—";
const toast = (m) => { const el=$("#toast"); el.textContent=m; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); };

const PRIORITIES = {
  P1:"P1 · Crítica",
  P2:"P2 · Alta",
  P3:"P3 · Normal",
  P4:"P4 · Mejora"
};
const ORIGINS = {
  email:"Correo",
  asistente:"ChatGPT",
  proyecto:"Proyecto",
  manual:"Manual"
};
const NOW_STATES = ["En trabajo","En pruebas"];
const WAIT_STATES = ["En seguimiento","Esperando informacion","Esperando proveedor","Programado","Pausado"];
const CLOSED_PROJECT_STATES = ["Finalizado","Cancelado"];
const CLOSED_TASK_STATES = ["Finalizada","Cancelada"];

const priorityLabel = (p) => PRIORITIES[p] || p || "—";
const pill = (p) => `<span class="pill ${(p||"").toLowerCase()}">${esc(p||"")}</span>`;
const priorityPill = (p) => `<span class="pill ${(p||"").toLowerCase()}">${esc(priorityLabel(p))}</span>`;

async function boot(){
  const { data:{session} } = await supabase.auth.getSession();
  state.session=session;
  if(session) await enterApp();
}
boot();

$("#loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  $("#loginMessage").textContent="Enviando enlace seguro...";
  const email=$("#loginEmail").value.trim().toLowerCase();
  if(!email.endsWith("@campestrepereira.com")){
    $("#loginMessage").textContent="Usa tu correo institucional @campestrepereira.com.";
    return;
  }
  const {error}=await supabase.auth.signInWithOtp({
    email,
    options:{ emailRedirectTo: window.location.href.split("#")[0] }
  });
  $("#loginMessage").textContent=error
    ? "No fue posible enviar el enlace de acceso. Si el correo llega, puedes abrirlo normalmente."
    : "Revisa tu correo y abre el enlace para ingresar.";
});

async function enterApp(){
  const email=state.session?.user?.email;
  const {data:access,error}=await supabase.from("accesos").select("nombre,rol,activo").eq("email",email).maybeSingle();
  if(error || !access || !access.activo){
    $("#loginMessage").textContent="Tu cuenta existe, pero aún no está autorizada en Gestión Sistemas.";
    await supabase.auth.signOut();
    state.session=null;
    return;
  }
  state.access=access;
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $("#sessionName").textContent=access.nombre;
  $("#sessionRole").textContent=access.rol==="admin"?"Administrador":access.rol==="gerencia"?"Gerencia":access.rol==="bienestar"?"Bienestar":"Consulta";
  $("#newTaskBtn").classList.toggle("hidden", !["admin","gerencia","bienestar"].includes(access.rol));
  await reload();
}

async function reload(){
  const [p,t,r,h]=await Promise.all([
    supabase.from("proyectos").select("*").order("destacado",{ascending:false}).order("updated_at",{ascending:false}),
    supabase.from("tareas").select("*").order("created_at",{ascending:false}),
    supabase.from("repositorios_github").select("*").eq("visible",true).eq("anio",2026).order("fecha_creacion_github"),
    supabase.from("historial").select("*").order("created_at",{ascending:false}).limit(120)
  ]);
  if(p.error||t.error||r.error||h.error){ toast("Error cargando información."); return; }
  state.projects=p.data||[];
  state.tasks=t.data||[];
  state.repos=r.data||[];
  state.history=h.data||[];
  fillProjectSelect();
  render();
}

function fillProjectSelect(){
  $("#taskProject").innerHTML='<option value="">Sin proyecto</option>'+
    state.projects
      .filter(p=>!CLOSED_PROJECT_STATES.includes(p.estado))
      .sort((a,b)=>a.titulo.localeCompare(b.titulo,"es"))
      .map(p=>`<option value="${p.id}">${esc(p.titulo)}</option>`).join("");
}

$("#logoutBtn").addEventListener("click", async()=>{await supabase.auth.signOut(); location.reload();});
$("#searchInput").addEventListener("input",e=>{state.search=e.target.value.toLowerCase().trim();render();});
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>{
  state.view=b.dataset.view;
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x===b));
  render();
}));
$("#reposBtn").addEventListener("click",showRepos);
$("#newTaskBtn").addEventListener("click",()=>{prefillRequester();$("#taskDialog").showModal();});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.close).close()));

function prefillRequester(){
  const name=(state.access?.nombre||"").toLowerCase();
  if(name.includes("laura")) $("#taskGroup").value="Gerente Laura";
  else if(name.includes("conny")||name.includes("constanza")) $("#taskGroup").value="Gerente Conny";
  else if(name.includes("carolina")) $("#taskGroup").value="Jefes / Coordinadores";
  else if(state.access?.rol==="gerencia") $("#taskGroup").value="Otras solicitudes";
}

$("#taskForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const payload={
    proyecto_id:$("#taskProject").value||null,
    titulo:$("#taskTitle").value.trim(),
    descripcion:$("#taskDescription").value.trim()||null,
    prioridad:$("#taskPriority").value,
    grupo_solicitante:$("#taskGroup").value,
    solicitante:state.access.nombre,
    fecha_limite:$("#taskDue").value||null,
    origen:"manual"
  };
  const {error}=await supabase.from("tareas").insert(payload);
  if(error){toast("No fue posible crear la tarea.");return;}
  $("#taskDialog").close();
  e.target.reset();
  toast("Tarea creada.");
  await reload();
});

function filteredProjects(){
  const q=state.search;
  return state.projects.filter(p=>{
    const text=[p.titulo,p.tipo_registro,p.categoria,p.subcategoria,p.descripcion,p.estado,p.solicitante,...(p.tags||[])].join(" ").toLowerCase();
    if(q && !text.includes(q)) return false;
    if(state.view==="redes") return p.categoria==="Redes e infraestructura";
    if(state.view==="desarrollos") return ["Desarrollos","Integraciones","Sistemas","Innovación"].includes(p.categoria);
    return true;
  });
}

function filteredTasks(){
  const q=state.search;
  return state.tasks.filter(t=>!q || [
    t.titulo,t.descripcion,t.estado,t.prioridad,t.solicitante,t.grupo_solicitante,t.origen,t.origen_referencia
  ].join(" ").toLowerCase().includes(q));
}

function projectCard(p){
  return `<article class="project-card" data-project="${p.id}">
    <div class="card-top">
      <span class="pill">${esc(p.tipo_registro||"Proyecto")}</span>
      ${priorityPill(p.prioridad)}
    </div>
    <h3 class="card-title">${esc(p.titulo)}</h3>
    <div class="card-meta">${esc(p.categoria)} · ${esc(p.estado)}</div>
    <div class="card-meta">${p.area_responsable ? "Área responsable: "+esc(p.area_responsable) : esc(p.solicitante||"Sin solicitante")}</div>
    <div class="progress"><span style="width:${Number(p.porcentaje)||0}%"></span></div>
    <div class="card-meta">${Number(p.porcentaje)>0 || p.estado==="Finalizado" ? "Avance registrado: "+(Number(p.porcentaje)||0)+"%" : "Avance pendiente de actualizar"}</div>
    <div class="tags">${(p.tags||[]).slice(0,5).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>
  </article>`;
}

function taskCard(t){
  const origin=ORIGINS[t.origen]||t.origen||"—";
  const subCount=state.tasks.filter(s=>s.parent_task_id===t.id).length;
  return `<article class="task-card" data-task="${t.id}">
    <div class="card-top">${priorityPill(t.prioridad)}<span class="pill">${esc(t.estado)}</span></div>
    <h3 class="card-title">${esc(t.titulo)}</h3>
    <div class="card-meta">${esc(t.solicitante||"")} ${t.fecha_limite?"· vence "+esc(t.fecha_limite):""}</div>
    <div class="tags">
      <span class="tag">Origen: ${esc(origin)}</span>
      ${t.proyecto_id?'<span class="tag">Con proyecto</span>':''}
      ${subCount?`<span class="tag">${subCount} subtarea${subCount===1?"":"s"}</span>`:""}
    </div>
  </article>`;
}

function renderStats(){
  const working=state.projects.filter(p=>NOW_STATES.includes(p.estado)).length;
  const waiting=state.projects.filter(p=>WAIT_STATES.includes(p.estado)).length;
  const openTasks=state.tasks.filter(t=>!t.parent_task_id && !CLOSED_TASK_STATES.includes(t.estado)).length;
  const done=state.projects.filter(p=>p.estado==="Finalizado").length;
  $("#stats").innerHTML=[
    ["En trabajo ahora",working],
    ["En seguimiento / espera",waiting],
    ["Tareas principales",openTasks],
    ["Finalizados 2026",done]
  ].map(([a,b])=>`<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join("");
}

function render(){
  renderStats();
  const titles={
    inicio:"Centro de Control",
    solicitudes:"Tareas y solicitudes",
    proyectos:"Proyectos y frentes de trabajo",
    redes:"Redes e infraestructura",
    desarrollos:"Desarrollos",
    historial:"Historial"
  };
  $("#viewTitle").textContent=titles[state.view]||"Centro de Control";
  const c=$("#content");

  if(state.view==="inicio") renderHome(c);
  else if(state.view==="solicitudes") renderTasks(c);
  else if(["proyectos","redes","desarrollos"].includes(state.view)) renderProjects(c);
  else renderHistory(c);

  document.querySelectorAll("[data-project]").forEach(el=>el.addEventListener("click",()=>showProject(el.dataset.project)));
  document.querySelectorAll("[data-task]").forEach(el=>el.addEventListener("click",()=>showTask(el.dataset.task)));
}

function renderHome(c){
  const now=filteredProjects().filter(p=>NOW_STATES.includes(p.estado)).slice(0,9);
  const waiting=filteredProjects().filter(p=>WAIT_STATES.includes(p.estado)).slice(0,6);
  const tasks=filteredTasks().filter(t=>!t.parent_task_id && !CLOSED_TASK_STATES.includes(t.estado)).slice(0,8);

  c.innerHTML=`
    <div class="section-head"><div><p class="eyebrow">Trabajo actual</p><h2>En ejecución</h2></div><div class="card-meta">${now.length} visibles</div></div>
    <div class="grid">${now.map(projectCard).join("")||'<div class="empty">No hay proyectos en ejecución.</div>'}</div>

    <div class="section-head"><div><p class="eyebrow">Dependencias</p><h2>En seguimiento o espera</h2></div><div class="card-meta">${waiting.length} visibles</div></div>
    <div class="grid">${waiting.map(projectCard).join("")||'<div class="empty">No hay proyectos esperando seguimiento.</div>'}</div>

    <div class="section-head"><div><p class="eyebrow">Acciones concretas</p><h2>Tareas principales pendientes</h2></div></div>
    <div class="grid">${tasks.map(taskCard).join("")||'<div class="empty">No hay tareas pendientes.</div>'}</div>`;
}

function renderProjects(c){
  const all=filteredProjects();

  if(state.view==="desarrollos"){
    const active=all.filter(p=>p.estado!=="Finalizado" && p.estado!=="Cancelado");
    const done=all.filter(p=>p.estado==="Finalizado");
    c.innerHTML=`
      <div class="section-head"><div><p class="eyebrow">Desarrollos vigentes</p><h2>En curso · ${active.length}</h2></div></div>
      <div class="grid">${active.map(projectCard).join("")||'<div class="empty">No hay desarrollos activos.</div>'}</div>
      <div class="section-head"><div><p class="eyebrow">Histórico 2026</p><h2>Finalizados · ${done.length}</h2></div><button class="btn secondary" id="inlineReposBtn">Ver repositorios GitHub</button></div>
      <div class="grid">${done.map(projectCard).join("")||'<div class="empty">No hay desarrollos finalizados.</div>'}</div>`;
    $("#inlineReposBtn")?.addEventListener("click",showRepos);
    return;
  }

  const projects=all.filter(p=>(p.tipo_registro||"Proyecto")==="Proyecto");
  const fronts=all.filter(p=>p.tipo_registro==="Frente operativo");

  c.innerHTML=`
    <div class="section-head"><div><p class="eyebrow">Entregables definidos</p><h2>Proyectos · ${projects.length}</h2></div></div>
    <div class="grid">${projects.map(projectCard).join("")||'<div class="empty">No se encontraron proyectos.</div>'}</div>
    ${fronts.length ? `
      <div class="section-head"><div><p class="eyebrow">Trabajo permanente</p><h2>Frentes operativos · ${fronts.length}</h2></div></div>
      <div class="grid">${fronts.map(projectCard).join("")}</div>
    ` : ""}`;
}

function renderTasks(c){
  const groups=["Gerente Laura","Gerente Conny","Jefes / Coordinadores","Otras solicitudes"];
  const tasks=filteredTasks().filter(t=>!t.parent_task_id && !CLOSED_TASK_STATES.includes(t.estado));
  const closed=filteredTasks().filter(t=>CLOSED_TASK_STATES.includes(t.estado)).length;

  c.innerHTML=`
    <div class="section-head">
      <div><p class="eyebrow">Pendientes por solicitante</p><h2>${tasks.length} tareas abiertas</h2></div>
      <div class="card-meta">${closed} cerradas fuera de esta vista</div>
    </div>
    <div class="columns">${groups.map(g=>`
      <div class="column">
        <h3>${g} · ${tasks.filter(t=>t.grupo_solicitante===g).length}</h3>
        ${tasks.filter(t=>t.grupo_solicitante===g).map(taskCard).join("")||'<div class="empty">Sin tareas</div>'}
      </div>`).join("")}
    </div>`;
}

function renderHistory(c){
  const q=state.search;
  const rows=state.history.filter(h=>!q || [h.accion,h.detalle,h.actor_email].join(" ").toLowerCase().includes(q));
  c.innerHTML=rows.map(h=>`
    <div class="history-row">
      <div class="card-meta">${fmt(h.created_at)}</div>
      <div><strong>${esc(h.detalle||h.accion)}</strong><div class="card-meta">${esc(h.actor_email||"Carga inicial")}</div></div>
    </div>`).join("")||'<div class="empty">Sin movimientos.</div>';
}

async function showProject(id){
  const p=state.projects.find(x=>x.id===id);
  if(!p) return;
  const tasks=state.tasks.filter(t=>t.proyecto_id===id);
  const roots=tasks.filter(t=>!t.parent_task_id);
  const isAdmin=state.access?.rol==="admin";
  const repoInfo=state.repos.find(r=>r.proyecto_id===id);
  const publicUrl=repoInfo?.public_url||null;
  const follow=Array.isArray(p.seguimiento)?p.seguimiento:[];

  const childrenOf=(parentId)=>tasks.filter(t=>t.parent_task_id===parentId);
  const treeHtml=roots.map(t=>{
    const children=childrenOf(t.id);
    return `<div class="task-line" data-task="${t.id}">
      <div style="width:100%">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
          <div>
            <strong>${esc(t.titulo)}</strong>
            <div class="card-meta">${esc(t.estado)} · ${esc(priorityLabel(t.prioridad))}</div>
          </div>
          <span class="pill">${children.length} subtarea${children.length===1?"":"s"}</span>
        </div>
        ${children.length?`<div style="margin-top:10px;padding-left:16px;border-left:2px solid #dbe7f5">
          ${children.map(s=>`<div class="task-line" data-task="${s.id}" style="padding:8px 0">
            <div>
              <strong>${esc(s.titulo)}</strong>
              <div class="card-meta">${esc(s.estado)} · ${esc(priorityLabel(s.prioridad))}</div>
            </div>
            <span class="pill">${esc(s.estado)}</span>
          </div>`).join("")}
        </div>`:""}
      </div>
    </div>`;
  }).join("");

  $("#detailContent").innerHTML=`<div class="modal-card">
    <div class="modal-head">
      <div><p class="eyebrow">${esc(p.tipo_registro||"Proyecto")} · ${esc(p.categoria)}</p><h2>${esc(p.titulo)}</h2></div>
      <button class="icon-btn" id="closeDetail">×</button>
    </div>
    <p class="muted">${esc(p.descripcion||"")}</p>
    <div class="detail-grid">
      <div class="detail-box"><span>Estado</span><strong>${esc(p.estado)}</strong></div>
      <div class="detail-box"><span>Prioridad</span><strong>${esc(priorityLabel(p.prioridad))}</strong></div>
      <div class="detail-box"><span>Avance</span><strong>${Number(p.porcentaje)>0 || p.estado==="Finalizado" ? (Number(p.porcentaje)||0)+"%" : "Pendiente de actualizar"}</strong></div>
      <div class="detail-box"><span>Área responsable</span><strong>${esc(p.area_responsable||"—")}</strong></div>
    </div>
    ${follow.length?`<p><strong>Seguimiento:</strong> ${follow.map(esc).join(" · ")}</p>`:""}
    ${publicUrl?`<p><a href="${esc(publicUrl)}" target="_blank" rel="noopener">Abrir desarrollo público ↗</a></p>`:""}
    ${isAdmin && p.github_url?`<p><a href="${esc(p.github_url)}" target="_blank" rel="noopener">Abrir repositorio técnico ↗</a></p>`:""}
    ${p.onedrive_url?`<p><a href="${esc(p.onedrive_url)}" target="_blank" rel="noopener">Abrir documentación en OneDrive ↗</a></p>`:""}
    ${isAdmin?`
      <div class="form-grid">
        <label>Estado<select id="editStatus">${["Nuevo","En analisis","Programado","En trabajo","En pruebas","En seguimiento","Esperando informacion","Esperando proveedor","Pausado","Finalizado","Cancelado"].map(s=>`<option ${s===p.estado?"selected":""}>${s}</option>`).join("")}</select></label>
        <label>Avance %<input id="editProgress" type="number" min="0" max="100" value="${p.porcentaje}" /></label>
      </div>
      <button id="saveProject" class="btn primary">Guardar avance</button>`:""}
    <div class="section-head"><div><p class="eyebrow">Estructura del proyecto</p><h3>${roots.length} tareas principales · ${tasks.length-roots.length} subtareas</h3></div></div>
    <div class="task-list">${treeHtml||'<div class="empty">Este proyecto no tiene tareas todavía.</div>'}</div>
  </div>`;

  $("#detailDialog").showModal();
  $("#closeDetail").onclick=()=>$("#detailDialog").close();
  $("#detailDialog").querySelectorAll("[data-task]").forEach(el=>el.addEventListener("click",e=>{
    e.stopPropagation();
    $("#detailDialog").close();
    showTask(el.dataset.task);
  }));

  if(isAdmin) $("#saveProject").onclick=async()=>{
    const {error}=await supabase.from("proyectos").update({
      estado:$("#editStatus").value,
      porcentaje:Number($("#editProgress").value)
    }).eq("id",p.id);
    if(error){toast("No fue posible actualizar.");return;}
    toast("Proyecto actualizado.");
    $("#detailDialog").close();
    await reload();
  };
}

async function showTask(id){
  const t=state.tasks.find(x=>x.id===id);
  if(!t) return;
  const project=state.projects.find(p=>p.id===t.proyecto_id);
  const parent=state.tasks.find(p=>p.id===t.parent_task_id);
  const children=state.tasks.filter(s=>s.parent_task_id===t.id);
  const isAdmin=state.access?.rol==="admin";
  const origin=ORIGINS[t.origen]||t.origen||"—";

  $("#detailContent").innerHTML=`<div class="modal-card">
    <div class="modal-head">
      <div><p class="eyebrow">${t.parent_task_id?"Subtarea":"Tarea principal"} · ${esc(origin)}</p><h2>${esc(t.titulo)}</h2></div>
      <button class="icon-btn" id="closeDetail">×</button>
    </div>
    <p class="muted">${esc(t.descripcion||"Sin descripción.")}</p>
    <div class="detail-grid">
      <div class="detail-box"><span>Estado</span><strong>${esc(t.estado)}</strong></div>
      <div class="detail-box"><span>Prioridad</span><strong>${esc(priorityLabel(t.prioridad))}</strong></div>
      <div class="detail-box"><span>Solicitante</span><strong>${esc(t.solicitante||"—")}</strong></div>
      <div class="detail-box"><span>Fecha límite</span><strong>${esc(t.fecha_limite||"Sin definir")}</strong></div>
    </div>
    ${project?`<p><strong>Proyecto:</strong> ${esc(project.titulo)}</p>`:""}
    ${parent?`<p><strong>Tarea principal:</strong> ${esc(parent.titulo)}</p>`:""}
    ${t.origen_referencia?`<p><strong>Referencia de origen:</strong> ${esc(t.origen_referencia)}${t.origen_fecha?" · "+esc(fmt(t.origen_fecha)):""}</p>`:""}
    ${t.origen_url?`<p><a href="${esc(t.origen_url)}" target="_blank" rel="noopener">Abrir origen ↗</a></p>`:""}
    ${children.length?`<div class="section-head"><div><p class="eyebrow">Desglose</p><h3>${children.length} subtareas</h3></div></div>
      <div class="task-list">${children.map(s=>`<div class="task-line" data-task="${s.id}">
        <div><strong>${esc(s.titulo)}</strong><div class="card-meta">${esc(s.estado)} · ${esc(priorityLabel(s.prioridad))}</div></div>
        <span class="pill">${esc(s.estado)}</span>
      </div>`).join("")}</div>`:""}
    ${isAdmin?`
      <div class="form-grid">
        <label>Estado<select id="editTaskStatus">${["Nueva","En analisis","Programada","En trabajo","En pruebas","Esperando informacion","Esperando proveedor","Finalizada","Cancelada"].map(s=>`<option ${s===t.estado?"selected":""}>${s}</option>`).join("")}</select></label>
        <label>Prioridad<select id="editTaskPriority">${Object.keys(PRIORITIES).map(p=>`<option value="${p}" ${p===t.prioridad?"selected":""}>${PRIORITIES[p]}</option>`).join("")}</select></label>
      </div>
      <button id="saveTask" class="btn primary">Guardar tarea</button>`:""}
  </div>`;

  $("#detailDialog").showModal();
  $("#closeDetail").onclick=()=>$("#detailDialog").close();
  $("#detailDialog").querySelectorAll("[data-task]").forEach(el=>el.addEventListener("click",e=>{
    e.stopPropagation();
    $("#detailDialog").close();
    showTask(el.dataset.task);
  }));

  if(isAdmin) $("#saveTask").onclick=async()=>{
    const changes={
      estado:$("#editTaskStatus").value,
      prioridad:$("#editTaskPriority").value
    };
    if(changes.estado==="Finalizada") changes.fecha_cierre=new Date().toISOString();
    const {error}=await supabase.from("tareas").update(changes).eq("id",t.id);
    if(error){toast("No fue posible actualizar la tarea.");return;}
    toast("Tarea actualizada.");
    $("#detailDialog").close();
    await reload();
  };
}

function showRepos(){
  $("#detailContent").innerHTML=`<div class="modal-card">
    <div class="modal-head">
      <div><p class="eyebrow">Desarrollos · 2026</p><h2>Desarrollos realizados</h2><p class="muted">Acceso a las versiones públicas. La configuración técnica del repositorio no se muestra en esta vista.</p></div>
      <button class="icon-btn" id="closeDetail">×</button>
    </div>
    <div class="repo-list">${state.repos.map(r=>`
      <div class="repo-card">
        <div><strong>${esc(r.nombre)}</strong><div class="card-meta">${esc(r.descripcion||"")}</div></div>
        ${r.public_url
          ? `<a href="${esc(r.public_url)}" target="_blank" rel="noopener">Ver desarrollo ↗</a>`
          : `<span class="card-meta">Sin enlace público configurado</span>`}
      </div>`).join("")}</div>
  </div>`;
  $("#detailDialog").showModal();
  $("#closeDetail").onclick=()=>$("#detailDialog").close();
}
