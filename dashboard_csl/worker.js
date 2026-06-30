/*
 * worker.js — serveur relais pour le mode "Cloud (Google)" de Jwar-code
 * --------------------------------------------------------------------
 * Ce script tourne sur Cloudflare Workers (gratuit jusqu'à 100 000 requêtes/jour).
 * Rôle :
 *   1. Vérifie le jeton d'identité Google envoyé par le navigateur de l'utilisateur.
 *   2. Applique un quota quotidien gratuit par utilisateur (via Workers KV).
 *   3. Relaie la requête vers l'API Anthropic en utilisant TA clé API,
 *      gardée secrète côté serveur (jamais visible par les utilisateurs).
 *
 * Voir README-deploiement.md pour les instructions complètes.
 */

const ALLOWED_ORIGIN = "*"; // remplace par l'origine exacte de ton site en production, ex: "https://monsite.com"
const DAILY_FREE_LIMIT = 30; // nombre de messages gratuits par utilisateur et par jour

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function verifyGoogleToken(idToken, expectedClientId) {
  // Utilise l'endpoint public de Google pour valider le jeton (simple, pas de dépendance JWT à gérer).
  const res = await fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken)
  );
  if (!res.ok) throw new Error("Jeton Google invalide");
  const payload = await res.json();
  if (payload.aud !== expectedClientId) throw new Error("Jeton Google destiné à une autre application");
  if (!payload.email_verified || payload.email_verified === "false") {
    throw new Error("Email Google non vérifié");
  }
  return payload; // contient email, name, picture, etc.
}

async function checkAndIncrementQuota(env, email) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `quota:${email}:${today}`;
  const current = parseInt((await env.QUOTA.get(key)) || "0", 10);
  if (current >= DAILY_FREE_LIMIT) {
    throw new Error(`Limite gratuite quotidienne atteinte (${DAILY_FREE_LIMIT} messages/jour). Réessaie demain.`);
  }
  await env.QUOTA.put(key, String(current + 1), { expirationTtl: 60 * 60 * 26 }); // expire après ~1 jour
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/chat" || request.method !== "POST") {
      return new Response("Not found", { status: 404, headers: corsHeaders() });
    }

    try {
      const body = await request.json();
      const { id_token, model, system, message } = body;
      if (!id_token || !message) {
        return jsonResponse({ error: "Requête incomplète." }, 400);
      }

      const allowedModels = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"];
      const chosenModel = allowedModels.includes(model) ? model : "claude-sonnet-4-6";

      const googleUser = await verifyGoogleToken(id_token, env.GOOGLE_CLIENT_ID);
      await checkAndIncrementQuota(env, googleUser.email);

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY, // secret défini côté serveur, jamais exposé
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: chosenModel,
          max_tokens: 4000,
          system: system || "",
          messages: [{ role: "user", content: message }],
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        return jsonResponse({ error: "Erreur API Claude (" + anthropicRes.status + ") : " + errText.slice(0, 300) }, 502);
      }

      const data = await anthropicRes.json();
      const text = (data.content || []).map((b) => b.text || "").join("\n");
      return jsonResponse({ text });
    } catch (err) {
      return jsonResponse({ error: err.message || String(err) }, 400);
    }
  },
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
