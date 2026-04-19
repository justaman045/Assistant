"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Bot, Check, ChevronDown, Loader2, Plus,
  Send, Share2, Trash2, X, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Memory, fetchMemories } from "@/lib/memory";
import { OpenRouterModel, supportsTools } from "@/lib/openrouter";
import { InputField, InputRequest } from "@/app/api/assistant/chat/route";
import {
  Assistant, AssistantChat, AssistantMessage, ActionRecord,
} from "@/lib/types";
import {
  fetchAssistants, fetchChats, createChat, saveMessages, deleteChat, updateAssistant,
} from "@/lib/assistants";

type SseEvent =
  | { type: "thinking"; text: string }
  | { type: "action"; label: string; success: boolean }
  | { type: "delta"; content: string }
  | { type: "done"; actions: { label: string; success: boolean }[] }
  | { type: "error"; text: string }
  | { type: "input_request"; message: string; fields: InputField[] };

const SUGGESTED: string[] = [
  "What subscriptions do I have?",
  "Add a task to review my budget",
  "Show my recent transactions",
  "What do you know about me?",
];

function InputRequestCard({
  request,
  onSubmit,
}: {
  request: InputRequest;
  onSubmit: (text: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  function set(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function toggle(key: string, option: string) {
    setValues((prev) => ({ ...prev, [key]: prev[key] === option ? "" : option }));
  }

  function handleSubmit() {
    const parts = request.fields
      .map((f) => {
        const v = values[f.key]?.trim();
        if (!v) return null;
        return `${f.label}: ${v}`;
      })
      .filter(Boolean);
    if (parts.length === 0) return;
    onSubmit(parts.join(", "));
  }

  const allRequiredFilled = request.fields
    .filter((f) => f.required !== false)
    .every((f) => values[f.key]?.trim());

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-800/60 dark:bg-indigo-950/20">
      <p className="mb-3 text-sm font-medium text-indigo-800 dark:text-indigo-200">{request.message}</p>
      <div className="space-y-3">
        {request.fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {field.label}{field.required !== false && <span className="ml-0.5 text-red-400">*</span>}
            </label>
            {field.type === "select" && field.options ? (
              <div className="flex flex-wrap gap-1.5">
                {field.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggle(field.key, opt)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      values[field.key] === opt
                        ? "bg-indigo-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                value={values[field.key] ?? ""}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!allRequiredFilled}
        className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        Confirm
      </button>
    </div>
  );
}

export default function AssistantChatPage() {
  const { assistantId } = useParams<{ assistantId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [allAssistants, setAllAssistants] = useState<Assistant[]>([]);
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [chats, setChats] = useState<AssistantChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinkingText, setThinkingText] = useState("");
  const [pendingActions, setPendingActions] = useState<ActionRecord[]>([]);
  const [inputRequest, setInputRequest] = useState<InputRequest | null>(null);
  const [model, setModel] = useState("openai/gpt-4o");
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [showHandoff, setShowHandoff] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/models").then((r) => r.json()).then(setAllModels).catch(() => {});

    Promise.all([
      fetchAssistants(user.uid),
      fetchChats(user.uid, assistantId),
      fetchMemories(user.uid),
    ]).then(([assistants, chatList, mems]) => {
      setAllAssistants(assistants);
      const found = assistants.find((a) => a.id === assistantId) ?? null;
      setAssistant(found);
      if (found?.model) setModel(found.model);
      setChats(chatList);
      setMemories(mems);
    }).finally(() => setLoading(false));
  }, [user, assistantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinkingText]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  function selectChat(chat: AssistantChat) {
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setPendingActions([]);
    setThinkingText("");
  }

  async function startNewChat() {
    setActiveChatId(null);
    setMessages([]);
    setPendingActions([]);
    setThinkingText("");
    inputRef.current?.focus();
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || streaming || !user || !assistant) return;
    setInput("");

    const userMsg: AssistantMessage = { role: "user", content: text, createdAt: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setStreaming(true);
    setThinkingText("Thinking…");
    setPendingActions([]);
    setInputRequest(null);

    let chatId = activeChatId;

    try {
      // Create chat doc on first message
      if (!chatId) {
        const newChat = await createChat(user.uid, assistantId, text);
        chatId = newChat.id;
        setActiveChatId(chatId);
        setChats((prev) => [newChat, ...prev]);
      }

      const token = await user.getIdToken();

      // Build OpenAI-format history (exclude actions metadata)
      const history = nextMessages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          uid: user.uid,
          messages: history,
          assistant: { name: assistant.name, emoji: assistant.emoji, personality: assistant.personality, systemPrompt: assistant.systemPrompt },
          model,
          memories: memories.map((m) => m.category === "rule" ? `[RULE] ${m.content}` : m.content),
        }),
      });

      if (!res.ok) { toast("Chat failed", "error"); setStreaming(false); return; }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let assistantContent = "";
      const completedActions: ActionRecord[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          let evt: SseEvent;
          try { evt = JSON.parse(raw); } catch { continue; }

          if (evt.type === "thinking") {
            setThinkingText(evt.text);
          } else if (evt.type === "action") {
            const action: ActionRecord = { tool: evt.label, label: evt.label, success: evt.success };
            completedActions.push(action);
            setPendingActions([...completedActions]);
            setThinkingText("Finishing up…");
          } else if (evt.type === "delta") {
            assistantContent += evt.content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return [...prev.slice(0, -1), { ...last, content: assistantContent }];
              }
              return [...prev, { role: "assistant", content: assistantContent, actions: completedActions, createdAt: Date.now() }];
            });
            setThinkingText("");
          } else if (evt.type === "input_request") {
            setInputRequest({ message: evt.message, fields: evt.fields });
            setThinkingText("");
          } else if (evt.type === "done") {
            setThinkingText("");
          } else if (evt.type === "error") {
            toast(`Error: ${(evt as { type: "error"; text: string }).text}`, "error");
          }
        }
      }

      // Persist final messages
      const finalAssistantMsg: AssistantMessage = {
        role: "assistant",
        content: assistantContent,
        actions: completedActions.length ? completedActions : undefined,
        createdAt: Date.now(),
      };
      const finalMessages = [...nextMessages, finalAssistantMsg];
      setMessages(finalMessages);
      if (chatId) {
        await saveMessages(chatId, finalMessages);
        setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, messages: finalMessages } : c));
      }
    } catch (e) {
      toast("Connection error", "error");
      console.error(e);
    } finally {
      setStreaming(false);
      setThinkingText("");
      setPendingActions([]);
    }
  }

  async function handleDeleteChat(chatId: string) {
    await deleteChat(chatId);
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
    }
    toast("Chat deleted", "info");
  }

  async function handleHandoff(targetAssistant: Assistant) {
    if (!user) return;
    setShowHandoff(false);

    const summary = messages
      .slice(-10)
      .map((m) => `${m.role === "user" ? "User" : targetAssistant.name}: ${m.content}`)
      .join("\n");

    const context: AssistantMessage = {
      role: "user",
      content: `[Context handed off from ${assistant?.name ?? "another assistant"}]\n\n${summary}\n\nPlease continue from here.`,
      createdAt: Date.now(),
    };

    router.push(`/assistants/${targetAssistant.id}?handoff=1`);

    // Store handoff context in sessionStorage for the target page to pick up
    sessionStorage.setItem("assistant_handoff", JSON.stringify({ context, from: assistant?.name }));
    toast(`Handed off to ${targetAssistant.emoji} ${targetAssistant.name}`, "success");
  }

  // Pick up handoff context on mount
  useEffect(() => {
    const raw = sessionStorage.getItem("assistant_handoff");
    if (!raw) return;
    sessionStorage.removeItem("assistant_handoff");
    try {
      const { context } = JSON.parse(raw) as { context: AssistantMessage; from: string };
      setMessages([context]);
    } catch { /* ignore */ }
  }, [assistantId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!assistant) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-500">Assistant not found</p>
        <button onClick={() => router.push("/assistants")} className="text-sm text-indigo-600 hover:underline">
          Back to assistants
        </button>
      </div>
    );
  }

  const otherAssistants = allAssistants.filter((a) => a.id !== assistantId);

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900">
      {/* ── Sidebar: chat history ─────────────────────────────────────────── */}
      {showSidebar && (
        <div className="flex w-56 shrink-0 flex-col border-r border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-3 dark:border-gray-800">
            <button
              onClick={() => router.push("/assistants")}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All assistants
            </button>
          </div>

          {/* Assistant info */}
          <div className="flex items-center gap-2.5 border-b border-gray-100 px-3 py-3 dark:border-gray-800">
            <span className="text-2xl">{assistant.emoji}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{assistant.name}</p>
              <p className="text-xs text-gray-400">AI Assistant</p>
            </div>
          </div>

          <button
            onClick={startNewChat}
            className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>

          <div className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
            {chats.length === 0 ? (
              <p className="px-2 pt-4 text-center text-xs text-gray-400">No chats yet</p>
            ) : (
              <div className="space-y-0.5">
                {chats.map((c) => (
                  <div key={c.id}
                    className={`group flex items-center gap-1 rounded-lg px-2 py-2 ${activeChatId === c.id ? "bg-indigo-50 dark:bg-indigo-950/40" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
                    <button onClick={() => selectChat(c)} className="min-w-0 flex-1 text-left">
                      <p className={`truncate text-xs font-medium ${activeChatId === c.id ? "text-indigo-700 dark:text-indigo-300" : "text-gray-600 dark:text-gray-400"}`}>
                        {c.title || "New chat"}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteChat(c.id)}
                      className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 hover:text-red-400 group-hover:opacity-100 dark:text-gray-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main chat area ────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar((s) => !s)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showSidebar ? "rotate-90" : "-rotate-90"}`} />
            </button>
            <span className="text-lg">{assistant.emoji}</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{assistant.name}</span>
          </div>
          <select
            value={model}
            onChange={(e) => {
              const newModel = e.target.value;
              setModel(newModel);
              updateAssistant(assistantId, { model: newModel }).catch(() => {});
            }}
            className="max-w-[180px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {allModels.length === 0 ? (
              <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
            ) : (
              allModels.map((m) => {
                const capable = supportsTools(m);
                return (
                  <option key={m.id} value={m.id} disabled={!capable}>
                    {capable ? "" : "⚠ "}{m.name}
                  </option>
                );
              })
            )}
          </select>
          {otherAssistants.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowHandoff((s) => !s)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:hover:border-indigo-600 dark:hover:text-indigo-400"
              >
                <Share2 className="h-3.5 w-3.5" /> Hand off
              </button>
              {showHandoff && (
                <div className="absolute right-0 top-9 z-10 w-48 rounded-xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                  <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500">Hand off to…</p>
                    <button onClick={() => setShowHandoff(false)}>
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>
                  {otherAssistants.map((a) => (
                    <button key={a.id} onClick={() => handleHandoff(a)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                      <span className="text-lg">{a.emoji}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{a.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {/* Empty state */}
          {messages.length === 0 && !streaming && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 text-4xl dark:from-indigo-950/40 dark:to-violet-950/40">
                {assistant.emoji}
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800 dark:text-gray-200">{assistant.name}</p>
                <p className="mt-1 text-sm text-gray-400">
                  Ask me to do things or answer questions about your dashboard.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED.map((q) => (
                  <button key={q} onClick={() => handleSend(q)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-lg dark:from-indigo-900/40 dark:to-violet-900/40">
                  {assistant.emoji}
                </div>
              )}
              <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                {/* Action cards */}
                {msg.actions?.map((action, ai) => (
                  <div key={ai}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${action.success ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"}`}>
                    <Check className={`h-3.5 w-3.5 shrink-0 ${action.success ? "" : "text-red-500"}`} />
                    {action.label}
                  </div>
                ))}
                {/* Bubble */}
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-gray-100 text-gray-800 rounded-tl-sm dark:bg-gray-800 dark:text-gray-100"}`}>
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="text-gray-800 dark:text-gray-100">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 text-inherit">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 text-inherit">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 text-inherit">{children}</ol>,
                          li: ({ children }) => <li className="text-inherit">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-inherit">{children}</strong>,
                          em: ({ children }) => <em className="italic text-inherit">{children}</em>,
                          code: ({ children }) => <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs dark:bg-white/10 text-inherit">{children}</code>,
                          pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-lg bg-black/10 p-3 font-mono text-xs dark:bg-white/10">{children}</pre>,
                          h1: ({ children }) => <h1 className="mb-1 text-base font-bold text-inherit">{children}</h1>,
                          h2: ({ children }) => <h2 className="mb-1 text-sm font-bold text-inherit">{children}</h2>,
                          h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold text-inherit">{children}</h3>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Live streaming / thinking state */}
          {streaming && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-lg dark:from-indigo-900/40 dark:to-violet-900/40">
                {assistant.emoji}
              </div>
              <div className="space-y-2">
                {/* Live action cards */}
                {pendingActions.map((action, ai) => (
                  <div key={ai}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${action.success ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"}`}>
                    <Check className="h-3.5 w-3.5 shrink-0" /> {action.label}
                  </div>
                ))}
                {thinkingText && (
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 dark:bg-gray-800">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{thinkingText}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive input request card */}
          {inputRequest && !streaming && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-lg dark:from-indigo-900/40 dark:to-violet-900/40">
                {assistant.emoji}
              </div>
              <div className="flex-1">
                <InputRequestCard
                  request={inputRequest}
                  onSubmit={(text) => {
                    setInputRequest(null);
                    handleSend(text);
                  }}
                />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={`Message ${assistant.name}…`}
              disabled={streaming}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-800"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || streaming}
              className="flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-3 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-gray-300 dark:text-gray-600">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
