import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const getSupabaseContext = () => ({
  url: Deno.env.get("SUPABASE_URL") || "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
});

async function getAuthenticatedUser(req: Request) {
  const { url, serviceKey } = getSupabaseContext();
  const authHeader = req.headers.get("Authorization");
  if (!url || !serviceKey || !authHeader) return null;

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: serviceKey,
    },
  });
  if (!response.ok) return null;
  return await response.json();
}

async function isPlatformAdmin(userId: string) {
  const { url, serviceKey } = getSupabaseContext();
  if (!url || !serviceKey || !userId) return false;

  const response = await fetch(
    `${url}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}&role=in.(admin,super_admin)&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!response.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function getProcedureKnowledge() {
  const { url, serviceKey } = getSupabaseContext();
  if (!url || !serviceKey) return [];

  const response = await fetch(
    `${url}/rest/v1/ai_learning_lessons?select=title,summary,content,steps,links,images,tags,audience&scope=eq.system&is_active=eq.true&order=created_at.desc&limit=20`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!response.ok) return [];
  return await response.json();
}

async function getBusinessContext(businessId: string, workspaceId?: string) {
  const { url, serviceKey } = getSupabaseContext();
  if (!url || !serviceKey || !businessId) return null;

  const params = new URLSearchParams({
    select: "id,workspace_id,business_name,short_description,industry,target_audience,mission_values,main_services,ai_tone,language",
    id: `eq.${businessId}`,
    limit: "1",
  });
  if (workspaceId) params.set("workspace_id", `eq.${workspaceId}`);

  const response = await fetch(`${url}/rest/v1/business_profiles?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages = [], business_id, workspace_id, admin_support = false } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages are required" }), { status: 400, headers: jsonHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: jsonHeaders });
    }

    // Admin business-support mode is intentionally server-authorized. The client
    // cannot impersonate an admin by setting admin_support=true.
    const adminMode = admin_support === true && await isPlatformAdmin(user.id);
    const procedures = await getProcedureKnowledge();
    const business = adminMode && business_id ? await getBusinessContext(business_id, workspace_id) : null;

    const procedureContext = procedures.length
      ? `\n\nOFFICIAL PULSE PROCEDURES / LEARNING:\n${JSON.stringify(procedures)}`
      : "";

    const businessContext = business
      ? `\n\nBUSINESS SUPPORT CONTEXT (authorized platform admin only):\n${JSON.stringify(business)}`
      : "";

    const systemPrompt = `You are Pulse AI's built-in support assistant.

Your job is to help businesses and users use Pulse AI correctly. Prefer official Pulse procedures when answering setup/how-to questions. If a matching procedure exists, explain it step-by-step and include the official links and image references from that procedure when useful.

Pulse AI has three important platform roles:
- Owner: complete Pulse AI platform access.
- Pulse AI Admin: platform operations, business oversight, and support; cannot create another Pulse AI Admin.
- Business Admin: full operational control inside one business workspace; no global platform access.

Business provisioning policy:
- Pulse AI Admins may request creation/provisioning of a business on the highest package with no time limit.
- AI approval is required as a risk/quality signal.
- Activation additionally requires approval from at least one different Pulse AI Admin.
- The requesting admin cannot approve their own request.
- The Owner remains protected and cannot be removed through normal role management.

Support policy:
- Answer in the user's language when possible.
- Be concise but procedural when the user is trying to complete a setup.
- Never invent credentials, tokens, IDs, URLs, or provider requirements.
- Never expose secrets or internal authorization data.
- If you cannot resolve the issue or the user asks for specific technical help, billing, or account issues, call the escalate_to_admin tool.
- In an escalation reply, tell the user to keep chatting while a specialist connects.
- Never show raw JSON or technical escalation data to the user.${procedureContext}${businessContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "escalate_to_admin",
              description: "Escalate the conversation to a human specialist when the AI cannot resolve the issue",
              parameters: {
                type: "object",
                properties: {
                  reason: { type: "string", description: "Why escalation is needed" },
                  reply: { type: "string", description: "Reply to user — tell them to keep chatting while a specialist connects" },
                },
                required: ["reason", "reply"],
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: jsonHeaders });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: jsonHeaders });
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    let reply = "";
    let needs_admin = false;

    if (choice?.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function?.name === "escalate_to_admin") {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          reply = args.reply || "I'm connecting you with a specialist. Please keep chatting in the meantime.";
          needs_admin = true;
        } catch {
          reply = "I'm connecting you with a specialist. Please keep chatting in the meantime.";
          needs_admin = true;
        }
      }
    } else {
      reply = choice?.message?.content || "I couldn't find an answer. Please try again.";
    }

    return new Response(JSON.stringify({
      reply,
      needs_admin,
      support_context: adminMode && business ? {
        business_id: business.id,
        workspace_id: business.workspace_id,
        business_name: business.business_name,
      } : null,
    }), { headers: jsonHeaders });
  } catch (e) {
    console.error("ai-help-bot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
