import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = "https://ejcspbaiksjuvbkxrkpe.supabase.co";
const SUPABASE_KEY = "sb_publishable_6nNZwtjkoAezvbxx-m2y8A_VoJTDP5H";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const state = { session:null, access:null, projects:[], tasks:[], repos:[], history:[], view:"inicio", search:"" };
const $ = (s) => document.querySelector(s);
const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const fmt = (d) => d ? new Intl.DateTimeFormat("es-CO",{dateStyle:"medium",timeStyle:d.includes?.("T")?"short":undefined}).format(new Date(d)) : "—";
const toast = (m) => { const el=$("#toast"); el.textContent=m; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); };
const pill = (p) => `<span class="pill ${(p||"").toLowerCase()}">${esc(p||"")}</span>`;

async function boot(){
  const { data:{session} } = await supabase.auth.getSession();
  state.session=session;
  if(session) await enterApp();
}
boot();

$("#loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  $("#loginMessage").textContent="Validando...";
  const email=$("#loginEmail").value.trim();
  const password=$("#loginPassword").value;
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error){ $("#loginMessage").textContent="No fue posible ingresar. Verifica usuario y contraseña."; return; }
  $("#loginMessage").textContent="";
  const {data:{session}}=await supabase.auth.getSession();
  state.session=session;
  await enterApp();
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
  $("#sessionRole").textContent=access.rol==="admin"?"Administrador":access.rol==="gerencia"?"Gerencia":"Consulta";
  $("#newTaskBtn").classList.toggle("hidden", !["admin","gerencia"].includes(access.rol));
  await reload();
}

async function reload(){
  const [p,t,r,h]=await Promise.all([
    supabase.from("proyectos").select("*").order("destacado",{ascending:false}).order("updated_at",{ascending:false}),
    supabase.from("tareas").select("*").order("created_at",{ascending:false}),
    supabase.from("repositorios_github").select("*").eq("visible",true).eq("anio",2026).order("fecha_creacion_github"),
    supabase.from("historial").select("*").order("created_at",{ascending:false}).limit(100)
  ]);
  if(p.error||t.error||r.error||h.error){ toast("Error cargando información."); return; }
  state.projects=p.data||[]; state.tasks=t.data||[]; state.repos=r.data||[]; state.history=h.data||[];
  fillProjectSelect();
  render();
}

function fillProjectSelect(){
  $("#taskProject").innerHTML='<option value="">Sin proyecto</option>'+state.projects.map(p=>`<option value="${p.id}">${esc(p.titulo)}</option>`).join("");
}

$("#logoutBtn").addEventListener("click", async()=>{await supabase.auth.signOut(); location.reload();});
$("#searchInput").addEventListener("input",e=>{state.search=e.target.value.toLowerCase().trim();render();});
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>{state.view=b.dataset.view;document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x===b));render();}));
$("#reposBtn").addEventListener("click",showRepos);
$("#newTaskBtn").addEventListener("click",()=>{prefillRequester();$("#taskDialog").showModal();});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.close).close()));

function prefillRequester(){
  const name=(state.access?.nombre||"").toLowerCase();
  if(name.includes("laura")) $("#taskGroup").value="Gerente Laura";
  else if(name.includes("conny")||name.includes("constanza")) $("#taskGroup").value="Gerente Conny";
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
  $("#taskDialog").close(); e.target.reset(); toast("Tarea creada."); await reload();
});

function filteredProjects(){
  const q=state.search;
  return state.projects.filter(p=>{
    const text=[p.titulo,p.categoria,p.subcategoria,p.descripcion,p.estado,p.solicitante,...(p.tags||[])].join(" ").toLowerCase();
    if(q && !text.includes(q)) return false;
    if(state.view==="redes") return p.categoria==="Redes e infraestructura";
    if(state.view==="desarrollos") return ["Desarrollos","Integraciones","Sistemas","Innovación"].includes(p.categoria);
    return true;
  });
}
function filteredTasks(){
  const q=state.search;
  return state.tasks.filter(t=>!q || [t.titulo,t.descripcion,t.estado,t.prioridad,t.solicitante,t.grupo_solicitante].join(" ").toLowerCase().includes(q));
}
function projectCard(p){
  return `<article class="project-card" data-project="${p.id}">
    <div class="card-top"><span class="pill">${esc(p.categoria)}</span>${pill(p.prioridad)}</div>
    <h3 class="card-title">${esc(p.titulo)}</h3>
    <div class="card-meta">${esc(p.estado)} · ${esc(p.solicitante||"Sin solicitante")}</div>
    <div class="progress"><span style="width:${Number(p.porcentaje)||0}%"></span></div>
    <div class="card-meta">${Number(p.porcentaje)||0}% de avance</div>
    <div class="tags">${(p.tags||[]).slice(0,5).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>
  </article>`;
}
function taskCard(t){
  return `<article class="task-card" data-task="${t.id}">
    <div class="card-top">${pill(t.prioridad)}<span class="pill">${esc(t.estado)}</span></div>
    <h3 class="card-title">${esc(t.titulo)}</h3>
    <div class="card-meta">${esc(t.solicitante||"")} ${t.fecha_limite?"· vence "+esc(t.fecha_limite):""}</div>
  </article>`;
}
function renderStats(){
  const active=state.projects.filter(p=>!["Finalizado","Cancelado"].includes(p.estado)).length;
  const done=state.projects.filter(p=>p.estado==="Finalizado").length;
  const openTasks=state.tasks.filter(t=>!["Finalizada","Cancelada"].includes(t.estado)).length;
  const networks=state.projects.filter(p=>p.categoria==="Redes e infraestructura").length;
  $("#stats").innerHTML=[
    ["Proyectos activos",active],["Tareas abiertas",openTasks],["Redes e infraestructura",networks],["Finalizados 2026",done]
  ].map(([a,b])=>`<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join("");
}
function render(){
  renderStats();
  const titles={inicio:"Centro de Control",solicitudes:"Solicitudes",proyectos:"Proyectos",redes:"Redes e infraestructura",desarrollos:"Desarrollos",historial:"Historial"};
  $("#viewTitle").textContent=titles[state.view]||"Centro de Control";
  const c=$("#content");
  if(state.view==="inicio") renderHome(c);
  else if(state.view==="solicitudes") renderTasks(c);
  else if(["proyectos","redes","desarrollos"].includes(state.view)) renderProjects(c);
  else renderHistory(c);
  document.querySelectorAll("[data-project]").forEach(el=>el.addEventListener("click",()=>showProject(el.dataset.project)));
}
function renderHome(c){
  const p=filteredProjects().slice(0,9);
  const t=filteredTasks().filter(x=>!["Finalizada","Cancelada"].includes(x.estado)).slice(0,8);
  c.innerHTML=`
    <div class="section-head"><div><p class="eyebrow">Prioridad actual</p><h2>Proyectos destacados</h2></div></div>
    <div class="grid">${p.map(projectCard).join("")||'<div class="empty">Sin proyectos.</div>'}</div>
    <div class="section-head"><div><p class="eyebrow">Trabajo operativo</p><h2>Tareas abiertas</h2></div></div>
    <div class="grid">${t.map(taskCard).join("")||'<div class="empty">No hay tareas abiertas.</div>'}</div>`;
}
function renderProjects(c){
  const p=filteredProjects();
  c.innerHTML=`<div class="section-head"><div><p class="eyebrow">Inventario 2026</p><h2>${p.length} proyectos</h2></div></div><div class="grid">${p.map(projectCard).join("")||'<div class="empty">No se encontraron proyectos.</div>'}</div>`;
}
function renderTasks(c){
  const groups=["Gerente Laura","Gerente Conny","Jefes / Coordinadores","Otras solicitudes"];
  const tasks=filteredTasks();
  c.innerHTML=`<div class="columns">${groups.map(g=>`<div class="column"><h3>${g} · ${tasks.filter(t=>t.grupo_solicitante===g).length}</h3>${tasks.filter(t=>t.grupo_solicitante===g).map(taskCard).join("")||'<div class="empty">Sin tareas</div>'}</div>`).join("")}</div>`;
}
function renderHistory(c){
  const q=state.search;
  const rows=state.history.filter(h=>!q || [h.accion,h.detalle,h.actor_email].join(" ").toLowerCase().includes(q));
  c.innerHTML=rows.map(h=>`<div class="history-row"><div class="card-meta">${fmt(h.created_at)}</div><div><strong>${esc(h.detalle||h.accion)}</strong><div class="card-meta">${esc(h.actor_email||"Carga inicial")}</div></div></div>`).join("")||'<div class="empty">Sin movimientos.</div>';
}
async function showProject(id){
  const p=state.projects.find(x=>x.id===id); if(!p)return;
  const tasks=state.tasks.filter(t=>t.proyecto_id===id);
  const isAdmin=state.access?.rol==="admin";
  $("#detailContent").innerHTML=`<div class="modal-card">
    <div class="modal-head"><div><p class="eyebrow">${esc(p.categoria)}</p><h2>${esc(p.titulo)}</h2></div><button class="icon-btn" id="closeDetail">×</button></div>
    <p class="muted">${esc(p.descripcion||"")}</p>
    <div class="detail-grid">
      <div class="detail-box"><span>Estado</span><strong>${esc(p.estado)}</strong></div>
      <div class="detail-box"><span>Prioridad</span><strong>${esc(p.prioridad)}</strong></div>
      <div class="detail-box"><span>Avance</span><strong>${Number(p.porcentaje)||0}%</strong></div>
      <div class="detail-box"><span>Solicitante</span><strong>${esc(p.solicitante||"—")}</strong></div>
    </div>
    ${p.github_url?`<p><a href="${esc(p.github_url)}" target="_blank" rel="noopener">Abrir repositorio GitHub ↗</a></p>`:""}
    ${isAdmin?`<div class="form-grid"><label>Estado<select id="editStatus">${["Nuevo","En analisis","Programado","En trabajo","En pruebas","En seguimiento","Esperando informacion","Esperando proveedor","Pausado","Finalizado","Cancelado"].map(s=>`<option ${s===p.estado?"selected":""}>${s}</option>`).join("")}</select></label><label>Avance %<input id="editProgress" type="number" min="0" max="100" value="${p.porcentaje}" /></label></div><button id="saveProject" class="btn primary">Guardar avance</button>`:""}
    <div class="section-head"><div><p class="eyebrow">Tareas relacionadas</p><h3>${tasks.length} tareas</h3></div></div>
    <div class="task-list">${tasks.map(t=>`<div class="task-line"><div><strong>${esc(t.titulo)}</strong><div class="card-meta">${esc(t.estado)} · ${esc(t.prioridad)}</div></div><span class="pill">${esc(t.estado)}</span></div>`).join("")||'<div class="empty">Este proyecto no tiene tareas hijas todavía.</div>'}</div>
  </div>`;
  $("#detailDialog").showModal();
  $("#closeDetail").onclick=()=>$("#detailDialog").close();
  if(isAdmin) $("#saveProject").onclick=async()=>{
    const {error}=await supabase.from("proyectos").update({estado:$("#editStatus").value,porcentaje:Number($("#editProgress").value)}).eq("id",p.id);
    if(error){toast("No fue posible actualizar.");return;} toast("Proyecto actualizado."); $("#detailDialog").close(); await reload();
  };
}
function showRepos(){
  $("#detailContent").innerHTML=`<div class="modal-card"><div class="modal-head"><div><p class="eyebrow">GitHub · 2026</p><h2>Desarrollos realizados</h2><p class="muted">Repositorios del Club creados durante 2026.</p></div><button class="icon-btn" id="closeDetail">×</button></div><div class="repo-list">${state.repos.map(r=>`<div class="repo-card"><div><strong>${esc(r.nombre)}</strong><div class="card-meta">${esc(r.descripcion||"")}</div></div><a href="${esc(r.url)}" target="_blank" rel="noopener">Abrir GitHub ↗</a></div>`).join("")}</div></div>`;
  $("#detailDialog").showModal(); $("#closeDetail").onclick=()=>$("#detailDialog").close();
}
