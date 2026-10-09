import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.1";

const SUPABASE_URL = "https://ejcspbaiksjuvbkxrkpe.supabase.co";
const SUPABASE_KEY = "sb_publishable_6nNZwtjkoAezvbxx-m2y8A_VoJTDP5H";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (s) => document.querySelector(s);
const authorizationId = new URLSearchParams(location.search).get("authorization_id");

function show(id) {
  ["#loadingBox","#authForm","#consentBox","#errorBox"].forEach(x => $(x).classList.add("hidden"));
  $(id).classList.remove("hidden");
}

async function init() {
  if (!authorizationId) {
    $("#errorMessage").textContent = "Falta authorization_id. Inicia la conexión desde ChatGPT.";
    show("#errorBox");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    show("#authForm");
    return;
  }

  const email = session.user?.email;
  const { data: access, error: accessError } = await supabase
    .from("accesos")
    .select("nombre,rol,activo")
    .eq("email", email)
    .maybeSingle();

  if (accessError || !access?.activo) {
    await supabase.auth.signOut();
    $("#errorMessage").textContent = "Este correo no está autorizado para usar Gestión Sistemas.";
    show("#errorBox");
    return;
  }

  const { data: details, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !details) {
    $("#errorMessage").textContent = "No fue posible validar la solicitud OAuth.";
    show("#errorBox");
    return;
  }

  $("#userName").textContent = access.nombre + " · " + access.rol;
  $("#clientName").textContent = details.client?.name || details.client_name || "ChatGPT";
  $("#scopeText").textContent = details.scope || "email profile";
  show("#consentBox");
}

$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#email").value.trim().toLowerCase();
  if (!email.endsWith("@campestrepereira.com")) {
    $("#authMessage").textContent = "Usa el correo institucional del Club.";
    return;
  }

  $("#authMessage").textContent = "Enviando enlace...";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href
    }
  });

  $("#authMessage").textContent = error
    ? "No fue posible enviar el enlace de acceso."
    : "Revisa tu correo. Abre el enlace y volverás a esta autorización.";
});

$("#approveBtn").addEventListener("click", async () => {
  $("#consentMessage").textContent = "Autorizando...";
  const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);
  if (error || !data?.redirect_url) {
    $("#consentMessage").textContent = "No fue posible completar la autorización.";
    return;
  }
  window.location.assign(data.redirect_url);
});

$("#denyBtn").addEventListener("click", async () => {
  const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);
  if (error || !data?.redirect_url) {
    $("#consentMessage").textContent = "No fue posible cancelar correctamente.";
    return;
  }
  window.location.assign(data.redirect_url);
});

init();
