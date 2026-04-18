export type TemplateCategory =
  | "storytelling"
  | "educational"
  | "persuasion"
  | "engagement"
  | "authority";

export interface TemplateVariable {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

export interface PromptTemplate {
  id: string;
  category: TemplateCategory;
  name: string;
  description: string;
  emoji: string;
  structure: string; // uses {{variable_key}} placeholders
  variables: TemplateVariable[];
  bestFor: string[];
}

export const CATEGORY_META: Record<TemplateCategory, { label: string; color: string }> = {
  storytelling: {
    label: "Storytelling",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  },
  educational: {
    label: "Educational",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  persuasion: {
    label: "Persuasion",
    color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  engagement: {
    label: "Engagement",
    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  },
  authority: {
    label: "Authority",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  },
};

export const TEMPLATES: PromptTemplate[] = [
  {
    id: "personal-story",
    category: "storytelling",
    name: "Personal Story Arc",
    description: "Hook readers with a turning point from your own experience",
    emoji: "📖",
    structure: `Write a {{content_type}} about {{topic}}.

Start with a specific moment when everything changed for me — include sensory detail and emotion, drop the reader into the scene.
Show the before/after contrast clearly: who I was vs. who I became.
Include one mistake or misbelief I held before this moment.
End with the single most important lesson and one concrete way readers can apply it today.

Tone: honest, personal, not preachy. Real beats polished.`,
    variables: [
      { key: "topic", label: "What's the story about?", placeholder: "e.g. failing my first startup and what I learned" },
      { key: "content_type", label: "Content type", placeholder: "e.g. LinkedIn post" },
    ],
    bestFor: ["LinkedIn post", "Substack article", "Blog post"],
  },
  {
    id: "contrarian-take",
    category: "persuasion",
    name: "The Contrarian Take",
    description: "Challenge what everyone assumes is true about a topic",
    emoji: "⚡",
    structure: `Write a {{content_type}} arguing that {{conventional_wisdom}} is wrong, or at least dangerously incomplete.

Open by stating the popular belief most people accept without question.
Pivot hard — "But here's what they're missing."
Back the contrarian view with {{num_examples}} specific examples or data points.
Acknowledge the nuance: the old view isn't worthless, just incomplete.
End with a sharper mental model that replaces the old one.`,
    variables: [
      { key: "conventional_wisdom", label: "What belief are you challenging?", placeholder: "e.g. you need to post daily to grow on LinkedIn" },
      { key: "num_examples", label: "Number of examples", placeholder: "e.g. 3" },
      { key: "content_type", label: "Content type", placeholder: "e.g. LinkedIn post" },
    ],
    bestFor: ["LinkedIn post", "Twitter / X thread", "Blog post"],
  },
  {
    id: "how-to-guide",
    category: "educational",
    name: "Step-by-Step Guide",
    description: "Break a complex process into clear, numbered, actionable steps",
    emoji: "🗺️",
    structure: `Write a {{content_type}} teaching how to {{skill_or_process}}.

Open by stating the exact, specific outcome the reader will have after following this.
Break the process into {{num_steps}} numbered steps. For each step:
  - Action: one clear thing to do
  - Why: why this step matters
  - Common mistake: what most people get wrong here
End with what success looks like — how will they know it worked?`,
    variables: [
      { key: "skill_or_process", label: "What skill or process?", placeholder: "e.g. write a cold email that actually gets replies" },
      { key: "num_steps", label: "Number of steps", placeholder: "e.g. 5" },
      { key: "content_type", label: "Content type", placeholder: "e.g. Blog post" },
    ],
    bestFor: ["Blog post", "LinkedIn post", "YouTube script"],
  },
  {
    id: "insight-list",
    category: "engagement",
    name: "The Insight List",
    description: "Pack high-value, counter-intuitive lessons into a scannable list",
    emoji: "✅",
    structure: `Write a {{content_type}} with {{num}} things I wish I had known about {{topic}} earlier.

Number each insight. For each one:
  - Lead with a bold, counter-intuitive or surprising statement as the headline
  - Follow with 2-3 sentences unpacking why — include a brief concrete example
The list should build: early insights are foundational, later ones are advanced.
Close with one sentence that ties them all together.`,
    variables: [
      { key: "topic", label: "What topic?", placeholder: "e.g. building an audience from scratch" },
      { key: "num", label: "Number of insights", placeholder: "e.g. 7" },
      { key: "content_type", label: "Content type", placeholder: "e.g. Twitter / X thread" },
    ],
    bestFor: ["Twitter / X thread", "LinkedIn post", "Email newsletter"],
  },
  {
    id: "case-study",
    category: "authority",
    name: "The Case Study",
    description: "Use a real-world example to teach a principle with proof",
    emoji: "🔬",
    structure: `Write a {{content_type}} using {{subject}} as a case study to illustrate {{lesson}}.

Open with one surprising or compelling fact about {{subject}} — something readers don't expect.
Walk through the key decisions or events chronologically, focusing on the 2-3 critical pivot points.
After each pivot, pause and extract the transferable lesson.
End with a direct challenge: how can the reader apply this in their own work this week?`,
    variables: [
      { key: "subject", label: "Who or what is the case study?", placeholder: "e.g. how Notion grew to a $10B valuation" },
      { key: "lesson", label: "What's the main lesson?", placeholder: "e.g. building in public creates compounding trust" },
      { key: "content_type", label: "Content type", placeholder: "e.g. Blog post" },
    ],
    bestFor: ["Blog post", "Substack article", "LinkedIn post"],
  },
  {
    id: "problem-agitate-solve",
    category: "persuasion",
    name: "Problem → Agitate → Solve",
    description: "Name the pain, make it vivid, then deliver the relief",
    emoji: "💊",
    structure: `Write a {{content_type}} about {{problem}} and how to overcome it.

Open by naming the problem in a way that makes the reader think "that's exactly me" — be specific, not generic.
Agitate: spend a short paragraph making the cost of this problem visceral — wasted time, missed opportunities, quiet frustration.
Introduce the solution clearly and without hype.
Show it working in practice: one concrete, specific example.
End with what life looks like after solving it — the emotional relief, not just the outcome.`,
    variables: [
      { key: "problem", label: "What problem are you solving?", placeholder: "e.g. writing LinkedIn posts that get zero engagement" },
      { key: "content_type", label: "Content type", placeholder: "e.g. LinkedIn post" },
    ],
    bestFor: ["LinkedIn post", "Email newsletter", "Blog post"],
  },
  {
    id: "original-framework",
    category: "authority",
    name: "The Original Framework",
    description: "Package your thinking into a named, memorable, teachable system",
    emoji: "🧩",
    structure: `Write a {{content_type}} introducing my {{framework_name}} framework for {{goal}}.

Open by describing the core problem this framework solves — make it feel urgent and familiar.
Introduce the framework name and its {{num_components}} components, each as a short memorable phrase.
For each component:
  - Name + one-sentence definition
  - Why this piece matters to the whole
  - A brief real-world example
Show how the parts work together as an integrated system.
End with the simplest possible first step to start using it today.`,
    variables: [
      { key: "framework_name", label: "What's the framework called?", placeholder: "e.g. The CORE Method" },
      { key: "goal", label: "What goal does it help achieve?", placeholder: "e.g. writing content that builds authority" },
      { key: "num_components", label: "Number of components", placeholder: "e.g. 4" },
      { key: "content_type", label: "Content type", placeholder: "e.g. LinkedIn post" },
    ],
    bestFor: ["LinkedIn post", "Blog post", "Substack article"],
  },
  {
    id: "question-hook",
    category: "engagement",
    name: "The Question Hook",
    description: "Force self-reflection with an opening question, then flip the answer",
    emoji: "❓",
    structure: `Write a {{content_type}} about {{topic}}.

Open with a thought-provoking question that makes readers stop and think about their own situation.
Answer it — but with a surprising twist they didn't expect. Flip the conventional answer.
Unpack why the twist is true using 3 supporting ideas, each with a brief example.
Close by echoing the opening question, this time with the new lens the reader now has.
The tone should feel like a smart conversation, not a lecture.`,
    variables: [
      { key: "topic", label: "What topic?", placeholder: "e.g. why most people plateau in their careers" },
      { key: "content_type", label: "Content type", placeholder: "e.g. LinkedIn post" },
    ],
    bestFor: ["LinkedIn post", "Twitter / X thread", "Blog post"],
  },
];

/** Fills a template's {{placeholders}} with provided values. */
export function fillTemplate(template: PromptTemplate, values: Record<string, string>): string {
  let result = template.structure;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value || `[${key}]`);
  }
  return result;
}
