import { NextRequest } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { enforceCredits } from "@/lib/enforce-credits";
import { logModelUsage } from "@/lib/model-usage";

export const runtime = "nodejs";

// ── Semantic similarity for memory deduplication ──────────────────────────────

const STOP_WORDS = new Set([
  "i","me","my","we","you","he","she","it","they","a","an","the","is","are","was","were",
  "be","been","being","have","has","had","do","does","did","will","would","could","should",
  "may","might","shall","can","to","of","in","on","at","for","with","about","as","and",
  "or","but","not","no","so","if","this","that","these","those","then","than","also",
  "just","only","very","more","most","some","any","all","both","each","few","many",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((w) => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function semanticallySimilar(a: string, b: string, threshold = 0.45): boolean {
  const ta = tokenize(a);
  const tb = tokenize(b);
  // Also check if all key words from the shorter one appear in the longer one
  const shorter = ta.size <= tb.size ? ta : tb;
  const longer = ta.size <= tb.size ? tb : ta;
  const containment = shorter.size === 0 ? 0 : [...shorter].filter((w) => longer.has(w)).length / shorter.size;
  return jaccardSimilarity(ta, tb) >= threshold || containment >= 0.7;
}

// ── Tool schemas (sent to LLM) ────────────────────────────────────────────────
// To add support for a new feature: append a new entry here + a case in executeTool().

const TOOLS = [
  // ── Subscriptions ──────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "add_subscription",
      description: "Add a new subscription. Ask only for missing required fields before calling.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Service name e.g. Netflix, YouTube Premium" },
          amount: { type: "number", description: "Price in INR (₹)" },
          billingCycle: { type: "string", enum: ["weekly", "monthly", "annual", "one-time"] },
          category: { type: "string", enum: ["Streaming", "Music", "Software", "Cloud", "News", "Gaming", "Fitness", "Learning", "Finance", "Other"] },
          emoji: { type: "string", description: "Single emoji for the service (optional)" },
          notes: { type: "string", description: "Optional personal notes" },
          nextRenewal: { type: "string", description: "Next renewal date YYYY-MM-DD (optional)" },
        },
        required: ["name", "amount", "billingCycle", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_subscriptions",
      description: "List the user's current subscriptions. Use to answer subscription questions or check for duplicates.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_subscription",
      description: "Cancel a subscription by name.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the subscription to cancel" },
        },
        required: ["name"],
      },
    },
  },
  // ── Planner ────────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Add a task to the planner.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          dueDate: { type: "string", description: "YYYY-MM-DD (optional)" },
          notes: { type: "string", description: "Optional notes" },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List the user's tasks in the planner.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["todo", "in-progress", "done", "all"], description: "Filter by status (default: all)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a task as done.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title (partial match ok)" },
        },
        required: ["title"],
      },
    },
  },
  // ── Finance ────────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "log_transaction",
      description: "Log an income or expense transaction.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number", description: "Amount in INR (₹)" },
          category: {
            type: "string",
            description: "Expense: Food & Dining, Transport, Shopping, Entertainment, Health, Rent & Housing, Utilities, Education, Travel, Other. Income: Salary, Freelance, Business, Investment, Other",
          },
          description: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD (defaults to today)" },
        },
        required: ["type", "amount", "category", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_transactions",
      description: "List recent financial transactions.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "How many to fetch (default 10, max 20)" },
        },
        required: [],
      },
    },
  },
  // ── Memory ─────────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "recall_user_info",
      description: "Recall stored memories and preferences about the user for personalization.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Save an important fact, rule, or personal note about the user to their permanent memory. Use this when the user tells you something important to remember — a rule (e.g. 'never suggest X'), a preference, a personal fact, or any note they want recalled in future sessions.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The memory to save, written as a clear, standalone statement." },
          category: {
            type: "string",
            enum: ["rule", "personal", "preference", "expertise", "topics", "style"],
            description: "rule = hard rules/never-do things; personal = personal life facts; preference = general preferences; expertise = skills/knowledge; topics = interests; style = communication style",
          },
        },
        required: ["content", "category"],
      },
    },
  },
  // ── Interactive input ──────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "request_input",
      description: "Use this instead of asking for missing details in plain text. It presents the user with an interactive form with quick-pick chips and input fields. Always use this when you need to collect structured information before performing an action.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Short sentence explaining what you need and why." },
          fields: {
            type: "array",
            description: "Fields to collect from the user.",
            items: {
              type: "object",
              properties: {
                key: { type: "string", description: "Internal key used to identify the field" },
                label: { type: "string", description: "Human-readable label" },
                type: { type: "string", enum: ["text", "number", "select", "date"] },
                options: { type: "array", items: { type: "string" }, description: "Choices for select fields" },
                required: { type: "boolean" },
                placeholder: { type: "string" },
              },
              required: ["key", "label", "type"],
            },
          },
        },
        required: ["message", "fields"],
      },
    },
  },
];

// ── Tool executor (server-side, uses Admin SDK) ───────────────────────────────

export interface InputField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface InputRequest {
  message: string;
  fields: InputField[];
}

type ToolResult = { label: string; result: string; success: boolean; inputRequest?: InputRequest };

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  uid: string
): Promise<ToolResult> {
  const db = adminDb();
  if (!db) return { label: name, result: "Database unavailable", success: false };

  try {
    switch (name) {

      case "add_subscription": {
        const { name: sName, amount, billingCycle, category, emoji, notes, nextRenewal } = args as {
          name: string; amount: number; billingCycle: string; category: string;
          emoji?: string; notes?: string; nextRenewal?: string;
        };
        await db.collection("managedSubscriptions").add({
          uid, name: sName, amount, billingCycle, category,
          currency: "INR", status: "active",
          emoji: emoji ?? "📦",
          notes: notes ?? null,
          nextRenewal: nextRenewal ?? null,
          createdAt: FieldValue.serverTimestamp(),
        });
        return {
          label: `Added ${sName} — ₹${amount}/${billingCycle}`,
          result: `Added subscription: ${sName} ₹${amount}/${billingCycle} (${category})`,
          success: true,
        };
      }

      case "list_subscriptions": {
        const snap = await db.collection("managedSubscriptions").where("uid", "==", uid).get();
        if (snap.empty) return { label: "Listed subscriptions", result: "No subscriptions found.", success: true };
        const lines = snap.docs.map((d) => {
          const s = d.data();
          return `• ${s.name}: ₹${s.amount}/${s.billingCycle} [${s.status}]${s.notes ? ` — ${s.notes}` : ""}`;
        });
        return { label: "Listed subscriptions", result: lines.join("\n"), success: true };
      }

      case "cancel_subscription": {
        const { name: sName } = args as { name: string };
        const snap = await db.collection("managedSubscriptions").where("uid", "==", uid).get();
        const match = snap.docs.find((d) =>
          d.data().name.toLowerCase().includes(sName.toLowerCase())
        );
        if (!match) return { label: `Cancel ${sName}`, result: `No subscription matching "${sName}" found.`, success: false };
        await match.ref.update({ status: "cancelled" });
        return { label: `Cancelled ${match.data().name}`, result: `Cancelled ${match.data().name}`, success: true };
      }

      case "add_task": {
        const { title, priority = "medium", dueDate, notes, tags } = args as {
          title: string; priority?: string; dueDate?: string; notes?: string; tags?: string[];
        };
        await db.collection("tasks").add({
          uid, title, priority, status: "todo",
          notes: notes ?? null,
          dueDate: dueDate ?? null,
          tags: tags ?? [],
          createdAt: FieldValue.serverTimestamp(),
        });
        return {
          label: `Added task: ${title}`,
          result: `Task added: "${title}" (${priority} priority)${dueDate ? `, due ${dueDate}` : ""}`,
          success: true,
        };
      }

      case "list_tasks": {
        const { status = "all" } = args as { status?: string };
        let q = db.collection("tasks").where("uid", "==", uid);
        if (status !== "all") q = q.where("status", "==", status) as typeof q;
        const snap = await q.orderBy("createdAt", "desc").limit(20).get();
        if (snap.empty) return { label: "Listed tasks", result: "No tasks found.", success: true };
        const lines = snap.docs.map((d) => {
          const t = d.data();
          return `• [${t.status}] ${t.title} (${t.priority})${t.dueDate ? ` — due ${t.dueDate}` : ""}`;
        });
        return { label: "Listed tasks", result: lines.join("\n"), success: true };
      }

      case "complete_task": {
        const { title } = args as { title: string };
        const snap = await db.collection("tasks").where("uid", "==", uid).get();
        const match = snap.docs.find((d) =>
          d.data().title.toLowerCase().includes(title.toLowerCase())
        );
        if (!match) return { label: "Complete task", result: `No task matching "${title}" found.`, success: false };
        await match.ref.update({ status: "done", completedAt: FieldValue.serverTimestamp() });
        return { label: `Completed: ${match.data().title}`, result: `Marked "${match.data().title}" as done.`, success: true };
      }

      case "log_transaction": {
        const { type, amount, category, description, date } = args as {
          type: string; amount: number; category: string; description: string; date?: string;
        };
        const txDate = date ?? new Date().toISOString().split("T")[0];
        await db.collection("transactions").add({
          uid, type, amount, category, description, date: txDate,
          createdAt: FieldValue.serverTimestamp(),
        });
        return {
          label: `Logged ${type}: ₹${amount} — ${description}`,
          result: `Logged ${type}: ₹${amount} in ${category} (${description}) on ${txDate}`,
          success: true,
        };
      }

      case "list_transactions": {
        const limit = Math.min(Number(args.limit ?? 10), 20);
        const snap = await db.collection("transactions")
          .where("uid", "==", uid)
          .orderBy("date", "desc")
          .limit(limit)
          .get();
        if (snap.empty) return { label: "Listed transactions", result: "No transactions found.", success: true };
        const lines = snap.docs.map((d) => {
          const t = d.data();
          return `• ${t.date} | ${t.type === "income" ? "+" : "-"}₹${t.amount} | ${t.category} | ${t.description}`;
        });
        return { label: "Listed transactions", result: lines.join("\n"), success: true };
      }

      case "recall_user_info": {
        const snap = await db
          .collection("users").doc(uid)
          .collection("memories")
          .orderBy("usageCount", "desc")
          .limit(25)
          .get();
        if (snap.empty) return { label: "Recalled memories", result: "No stored memories about this user yet.", success: true };
        const lines = snap.docs.map((d) => `• [${d.data().category ?? "personal"}] ${d.data().content}`);
        return { label: "Recalled user memories", result: lines.join("\n"), success: true };
      }

      case "save_memory": {
        const { content, category } = args as { content: string; category: string };

        // Server-side semantic dedup — fetch existing memories and check similarity
        const existingSnap = await db.collection("users").doc(uid).collection("memories").get();
        const existing = existingSnap.docs.map((d) => d.data().content as string);
        const duplicate = existing.find((e) => semanticallySimilar(content, e));

        if (duplicate) {
          return {
            label: `Already in memory (skipped duplicate)`,
            result: `Already stored: "${duplicate.slice(0, 80)}"`,
            success: true,
          };
        }

        await db.collection("users").doc(uid).collection("memories").add({
          content, category, source: "manual", type: "manual",
          usageCount: 0, createdAt: FieldValue.serverTimestamp(),
        });
        return { label: `Saved to memory: "${content.slice(0, 50)}${content.length > 50 ? "…" : ""}"`, result: `Saved to memory.`, success: true };
      }

      case "request_input": {
        const { message, fields } = args as unknown as InputRequest;
        return {
          label: "Asking for details",
          result: "Waiting for user input.",
          success: true,
          inputRequest: { message, fields },
        };
      }

      default:
        return { label: name, result: `Unknown tool: ${name}`, success: false };
    }
  } catch (e) {
    return { label: name, result: `Error: ${(e as Error).message}`, success: false };
  }
}

// ── Main route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = await getActiveApiKey();
  if (!apiKey) return new Response("OpenRouter not configured", { status: 500 });

  const { uid, messages, assistant, model = "openai/gpt-4o", memories } = await req.json() as {
    uid: string;
    messages: Array<{ role: string; content: string }>;
    assistant: { name: string; emoji: string; personality: string; systemPrompt?: string };
    model: string;
    memories?: string[];
  };

  const credit = await enforceCredits(req, model, `assistant:${uid}`);
  if (credit.error) return credit.error;

  let system: string;

  if (assistant.systemPrompt?.trim()) {
    // User-defined system prompt — use it as the foundation, then append tool rules
    system = assistant.systemPrompt.trim();
    system += `\n\n---\nYou are embedded in a personal dashboard as ${assistant.emoji} ${assistant.name}. You can take real actions on the user's data using the tools available to you.`;
  } else {
    system = `You are ${assistant.emoji} ${assistant.name}, a personal AI assistant embedded in the user's dashboard. You can take real actions on the user's data using the tools available to you.`;
  }

  system += `

## Memory — CRITICAL RULES (follow these without exception)

### Auto-saving (do this WITHOUT being asked)
After reading every user message, silently ask yourself: "Does this contain any fact worth remembering for future conversations?" If YES — call save_memory BEFORE replying. Do NOT wait for the user to say "remember this". Save automatically when you detect:
- Financial facts: savings amount, income, salary, rent, EMIs, debts, investments, financial goals (e.g. "I have ₹48,000 in savings" → save immediately)
- Personal facts: family, relationships, city, job, age, health conditions
- Preferences: likes, dislikes, habits, dietary choices, hobbies
- Goals: targets the user mentions (save ₹X by date, lose weight, etc.)
- Rules/constraints: things to never do, people to avoid, restrictions
- Any fact that would be useful to know in a future conversation

### Recall before answering personal questions
When the user asks about themselves — savings, finances, preferences, personal facts — ALWAYS call recall_user_info FIRST before answering. Never say "I don't have that data" or return ₹0 without first checking memory. The answer may be stored there even if it's not in the app's tracked data.

### Deduplication (important)
Before calling save_memory, check the memories already shown below. If the new memory means the same thing as an existing one — even if worded differently — do NOT save. Just acknowledge you already have it ("Already noted 👍"). Only save genuinely new information.

### Other rules
- Save EVERY distinct fact as a SEPARATE save_memory call — do not batch multiple facts into one.
- Use category "rule" for hard constraints. "personal" for life facts. "preference" for likes/dislikes. "expertise" for skills.
- When declining something due to a stored rule, respond warmly and mention the reason naturally.
- After saving a new memory, briefly confirm it. If already existed, say "Already noted that one 👍".

## Action Rules
- When the user asks you to do something actionable, check if you have all required fields. If not, ask ONLY for missing required ones.
- When you have everything, call the tool immediately — no confirmation needed.
- After completing an action, give a brief friendly confirmation (1-2 sentences max).
- For read/list requests, format data clearly with bullet points.
- Never make up data. If a tool returns no results, say so honestly.
- You always use Indian Rupees (₹/INR) for money.
- Today's date: ${new Date().toISOString().split("T")[0]}`;

  if (assistant.personality?.trim()) {
    system += `\n\n## Personality\n${assistant.personality.trim()}`;
  }

  if (memories?.length) {
    const rules = memories.filter((m) => m.startsWith("[RULE]"));
    const rest = memories.filter((m) => !m.startsWith("[RULE]"));
    if (rules.length) {
      system += `\n\n## Hard Rules (MUST follow — never violate these)\n${rules.map((m) => `• ${m.replace("[RULE] ", "")}`).join("\n")}`;
    }
    if (rest.length) {
      system += `\n\n## About This User\n${rest.map((m) => `• ${m}`).join("\n")}`;
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const llmMessages: Array<{
          role: string;
          content: string | null;
          tool_calls?: unknown[];
          tool_call_id?: string;
          name?: string;
        }> = [{ role: "system", content: system }, ...messages];

        const actions: Array<{ label: string; success: boolean }> = [];
        const MAX_ITERATIONS = 8;

        for (let i = 0; i < MAX_ITERATIONS; i++) {
          // Non-streaming call to detect tool use
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://personal-dashboard.app",
              "X-Title": "Personal Dashboard",
            },
            body: JSON.stringify({
              model,
              stream: false,
              tools: TOOLS,
              tool_choice: "auto",
              messages: llmMessages,
            }),
          });

          if (!res.ok) {
            let detail = res.status.toString();
            try { const body = await res.json(); detail = body?.error?.message ?? body?.message ?? detail; } catch { /* ignore */ }
            send({ type: "error", text: `Model error (${res.status}): ${detail}` });
            break;
          }

          const json = await res.json();
          const msg = json.choices?.[0]?.message;
          if (!msg) break;

          // No tool calls → this IS the final response; emit it directly
          if (!msg.tool_calls?.length) {
            const content: string = msg.content ?? "";
            send({ type: "delta", content });
            send({ type: "done", actions });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            logModelUsage(model, "assistant", uid).catch(() => {});
            break;
          }

          // Has tool calls — execute each one
          llmMessages.push({ role: "assistant", content: null, tool_calls: msg.tool_calls });

          for (const tc of msg.tool_calls) {
            const toolName: string = tc.function?.name ?? "";
            let toolArgs: Record<string, unknown> = {};
            try { toolArgs = JSON.parse(tc.function?.arguments ?? "{}"); } catch { /* ignore */ }

            send({ type: "thinking", text: toolName.replace(/_/g, " ") });

            const result = await executeTool(toolName, toolArgs, uid);
            actions.push({ label: result.label, success: result.success });
            // input_request is a client-side event — don't feed back to LLM, just break
            if (result.inputRequest) {
              send({ type: "input_request", ...result.inputRequest });
              send({ type: "done", actions });
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }

            send({ type: "action", label: result.label, success: result.success });

            llmMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: toolName,
              content: result.result,
            });
          }
        }

        controller.close();
      } catch (e) {
        send({ type: "error", text: (e as Error).message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
