"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  fetchPartners, fetchMessages, addMessage, clearMessages,
  buildSystemPrompt, CATEGORY_LABELS, updatePartner,
} from "@/lib/roleplay";
import { RoleplayPartner, RoleplayMessage } from "@/lib/types";
import { DEFAULT_MODEL, OpenRouterModel } from "@/lib/openrouter";
import { fetchMemories, saveMemories, Memory } from "@/lib/memory";
import ModelPicker from "@/components/ModelPicker";
import { ArrowLeft, Send, Loader2, Trash2, Brain } from "lucide-react";
import Link from "next/link";

export default function RoleplayChatPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.partnerId as string;
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [partner, setPartner] = useState<RoleplayPartner | null>(null);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState(() => userProfile?.defaultModel ?? DEFAULT_MODEL);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Memory state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [togglingMemory, setTogglingMemory] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchPartners(user.uid).then((ps) => {
      const found = ps.find((p) => p.id === partnerId);
      if (!found) { router.replace("/roleplay"); return; }
      setPartner(found);
      // Load memories if enabled
      if (found.memoryEnabled) {
        fetchMemories(user.uid).then(setMemories).catch(() => {});
      }
    });
    fetchMessages(partnerId).then((msgs) => {
      setMessages(msgs);
      setLoadingHistory(false);
    });
    fetch("/api/models").then((r) => r.json()).then(setModels).catch(() => {});
  }, [user, partnerId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function toggleMemory() {
    if (!partner || !user) return;
    setTogglingMemory(true);
    const next = !partner.memoryEnabled;
    try {
      await updatePartner(partnerId, { memoryEnabled: next });
      setPartner((p) => p ? { ...p, memoryEnabled: next } : p);
      if (next && memories.length === 0) {
        fetchMemories(user.uid).then(setMemories).catch(() => {});
      }
      toast(`Memory learning ${next ? "enabled" : "disabled"}`, "success");
    } catch {
      toast("Failed to update memory setting", "error");
    } finally {
      setTogglingMemory(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || streaming || !user || !partner) return;
    const userText = input.trim();
    setInput("");

    const userMsg: RoleplayMessage = {
      id: Date.now().toString(), role: "user", content: userText, createdAt: null,
    };
    setMessages((prev) => [...prev, userMsg]);
    await addMessage(partnerId, "user", userText);

    const history = [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, content: m.content }));

    // Build system prompt — inject memories if enabled
    const memoryContext = partner.memoryEnabled && memories.length > 0
      ? memories.map((m) => `• ${m.content}`).join("\n")
      : undefined;
    const systemPrompt = buildSystemPrompt(partner, memoryContext);

    setStreaming(true);
    let responseText = "";
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", createdAt: null }]);

    abortRef.current = new AbortController();
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/roleplay/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history, systemPrompt, model }),
        signal: abortRef.current.signal,
      });

      if (res.status === 402) {
        toast("Not enough credits", "error");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        toast(errText ? `Error: ${errText.slice(0, 120)}` : "Generation failed", "error");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) {
              responseText += delta;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: responseText } : m)
              );
            }
          } catch { /* skip malformed SSE chunk */ }
        }
      }

      if (responseText) {
        await addMessage(partnerId, "assistant", responseText);

        // Extract and save memories — fire-and-forget, never blocks UI
        if (partner.memoryEnabled && responseText.length > 20) {
          extractAndSaveMemory(user.uid, token, userText, responseText);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("Error: " + (e as Error).message, "error");
    } finally {
      setStreaming(false);
    }
  }

  function extractAndSaveMemory(uid: string, token: string, userText: string, aiResponse: string) {
    const existingContents = memories.map((m) => m.content);
    fetch("/api/extract-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        topic: userText,
        content: aiResponse,
        existingMemories: existingContents,
      }),
    })
      .then((r) => r.ok ? r.json() : [])
      .then(async (extracted: { content: string; category: string }[]) => {
        if (!extracted.length) return;
        await saveMemories(uid, extracted as Parameters<typeof saveMemories>[1]);
        // Refresh memories so next message has the updated context
        fetchMemories(uid).then(setMemories).catch(() => {});
      })
      .catch(() => {});
  }

  async function handleClear() {
    await clearMessages(partnerId);
    setMessages([]);
    toast("Chat cleared", "info");
  }

  if (!partner) return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
        <div className="flex items-center gap-3">
          <Link href="/roleplay" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-2xl">{partner.avatar}</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{partner.name}</p>
            <p className="text-xs text-gray-400">{CATEGORY_LABELS[partner.category]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Memory toggle */}
          <button
            onClick={toggleMemory}
            disabled={togglingMemory}
            title={partner.memoryEnabled ? "Memory learning ON — click to disable" : "Memory learning OFF — click to enable"}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              partner.memoryEnabled
                ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500"
            }`}
          >
            {togglingMemory
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Brain className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{partner.memoryEnabled ? "Memory on" : "Memory off"}</span>
            {partner.memoryEnabled && memories.length > 0 && (
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] dark:bg-indigo-900">
                {memories.length}
              </span>
            )}
          </button>

          <div className="w-52 min-w-0">
            <ModelPicker models={models} value={model} onChange={setModel} loading={models.length === 0} error="" />
          </div>

          <button
            onClick={handleClear}
            title="Clear chat"
            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-4 dark:bg-gray-950">
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="text-5xl">{partner.avatar}</span>
            <p className="mt-3 font-medium text-gray-900 dark:text-gray-100">Start chatting with {partner.name}</p>
            <p className="mt-1 max-w-xs text-sm text-gray-400">{partner.persona.slice(0, 100)}…</p>
            {partner.memoryEnabled && memories.length > 0 && (
              <p className="mt-3 flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400">
                <Brain className="h-3 w-3" /> Using {memories.length} memories to personalise responses
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <span className="mt-1 shrink-0 text-xl">{partner.avatar}</span>
                )}
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-800 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                }`}>
                  {msg.content || (streaming ? <span className="inline-block h-4 w-0.5 animate-pulse bg-current align-text-bottom" /> : "")}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="rounded-b-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
        {partner.memoryEnabled && (
          <p className="mb-2 flex items-center gap-1 text-[11px] text-indigo-400 dark:text-indigo-500">
            <Brain className="h-3 w-3" />
            Memory learning active — conversations improve personalisation across all features
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Message ${partner.name}…`}
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            onClick={streaming ? () => abortRef.current?.abort() : handleSend}
            disabled={!input.trim() && !streaming}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              streaming ? "bg-red-500 text-white hover:bg-red-600" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
            }`}
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
