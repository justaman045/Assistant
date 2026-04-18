import type { ComponentType } from "react";
import {
  Briefcase,
  Send,
  MessageSquare,
  FileText,
  Video,
  Newspaper,
  Type,
  RefreshCw,
  Package,
  Megaphone,
  UserPlus,
  BarChart2,
  ClipboardList,
  ListChecks,
  Search,
  PanelTop,
  UserCog,
  Layers,
} from "lucide-react";
import { LengthTarget } from "./types";

type Icon = ComponentType<{ className?: string; size?: number }>;

export type AppField = {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  required: boolean;
};

type BaseApp = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: Icon;
  accentBg: string;
  accentText: string;
  contentType: string;
};

export type AvailableApp = BaseApp & {
  status: "available";
  fields: AppField[];
  buildPrompt: (values: Record<string, string>) => string;
  defaultLength: LengthTarget;
};

export type ComingSoonApp = BaseApp & {
  status: "coming-soon";
};

export type AppDef = AvailableApp | ComingSoonApp;

export function isAvailable(app: AppDef): app is AvailableApp {
  return app.status === "available";
}

export const APPS: AppDef[] = [
  // ─── Content Creation ────────────────────────────────────────────────────
  {
    id: "linkedin-post",
    name: "LinkedIn Post",
    tagline: "Professional posts that get engagement",
    description:
      "Turn your insights and experiences into compelling LinkedIn posts that resonate with your professional network.",
    category: "Content Creation",
    icon: Briefcase,
    accentBg: "bg-blue-100 dark:bg-blue-950",
    accentText: "text-blue-600 dark:text-blue-400",
    contentType: "LinkedIn post",
    status: "available",
    defaultLength: { count: 300, unit: "words" },
    fields: [
      {
        id: "topic",
        label: "What's your post about?",
        placeholder: "e.g. A lesson I learned from failing my first startup…",
        type: "textarea",
        required: true,
      },
      {
        id: "angle",
        label: "Hook style",
        placeholder: "",
        type: "select",
        options: [
          "Personal story",
          "Professional insight",
          "Contrarian opinion",
          "How-to tips",
          "Industry trend",
        ],
        required: true,
      },
      {
        id: "cta",
        label: "Call to action (optional)",
        placeholder: "e.g. What do you think? Have you experienced this?",
        type: "text",
        required: false,
      },
    ],
    buildPrompt: (v) =>
      `Write a LinkedIn post about: ${v.topic}. Use a "${v.angle}" hook style${
        v.cta ? `. End with this CTA: ${v.cta}` : ""
      }. Make it authentic, engaging, and formatted well for LinkedIn (short paragraphs, line breaks, one or two relevant emojis max).`,
  },
  {
    id: "twitter-thread",
    name: "Twitter / X Thread",
    tagline: "Threads that go viral",
    description:
      "Craft compelling Twitter/X threads that educate, entertain, and grow your following.",
    category: "Content Creation",
    icon: MessageSquare,
    accentBg: "bg-sky-100 dark:bg-sky-950",
    accentText: "text-sky-600 dark:text-sky-400",
    contentType: "Twitter / X thread",
    status: "available",
    defaultLength: { count: 800, unit: "words" },
    fields: [
      {
        id: "topic",
        label: "Thread topic",
        placeholder: "e.g. 10 things I learned building a $1M SaaS in 12 months",
        type: "textarea",
        required: true,
      },
      {
        id: "tweets",
        label: "Number of tweets",
        placeholder: "",
        type: "select",
        options: ["5 tweets", "7 tweets", "10 tweets", "12 tweets", "15 tweets"],
        required: true,
      },
      {
        id: "style",
        label: "Style",
        placeholder: "",
        type: "select",
        options: [
          "Educational / how-to",
          "Personal story",
          "Contrarian opinion",
          "Industry insights",
          "Listicle",
        ],
        required: true,
      },
    ],
    buildPrompt: (v) =>
      `Write a Twitter/X thread about: ${v.topic}. Make it exactly ${v.tweets}. Style: ${v.style}. Format each tweet numbered (1/, 2/, etc.). The first tweet must be a strong hook that makes people want to read on. End with a follow/retweet CTA.`,
  },
  {
    id: "blog-post",
    name: "Blog Post",
    tagline: "Long-form content that ranks and converts",
    description:
      "Generate SEO-friendly blog posts that establish your expertise and drive organic traffic.",
    category: "Content Creation",
    icon: FileText,
    accentBg: "bg-purple-100 dark:bg-purple-950",
    accentText: "text-purple-600 dark:text-purple-400",
    contentType: "Blog post",
    status: "available",
    defaultLength: { count: 1200, unit: "words" },
    fields: [
      {
        id: "title",
        label: "Title / topic",
        placeholder: "e.g. How to build a morning routine that actually sticks",
        type: "text",
        required: true,
      },
      {
        id: "audience",
        label: "Target audience",
        placeholder: "e.g. Busy professionals who struggle with consistency",
        type: "text",
        required: true,
      },
      {
        id: "keyPoints",
        label: "Key points to cover",
        placeholder: "e.g. Why most routines fail, the 3-step framework, common mistakes",
        type: "textarea",
        required: true,
      },
      {
        id: "keyword",
        label: "SEO keyword (optional)",
        placeholder: "e.g. morning routine for productivity",
        type: "text",
        required: false,
      },
    ],
    buildPrompt: (v) =>
      `Write a comprehensive blog post titled "${v.title}" for ${v.audience}. Cover these key points: ${v.keyPoints}.${
        v.keyword ? ` Optimize for the keyword: "${v.keyword}".` : ""
      } Include an engaging intro, clear H2 sections, actionable advice, and a strong conclusion with a CTA.`,
  },
  {
    id: "youtube-script",
    name: "YouTube Script",
    tagline: "Scripts that keep viewers watching",
    description:
      "Write engaging YouTube video scripts with strong hooks, clear structure, and high viewer-retention techniques.",
    category: "Content Creation",
    icon: Video,
    accentBg: "bg-red-100 dark:bg-red-950",
    accentText: "text-red-600 dark:text-red-400",
    contentType: "YouTube script",
    status: "available",
    defaultLength: { count: 1500, unit: "words" },
    fields: [
      {
        id: "topic",
        label: "Video topic",
        placeholder: "e.g. 5 AI tools that replaced my entire design team",
        type: "text",
        required: true,
      },
      {
        id: "hookStyle",
        label: "Hook style",
        placeholder: "",
        type: "select",
        options: [
          "Bold claim / stat",
          "Story / anecdote",
          "Surprising question",
          "Controversy",
          "Transformation result",
        ],
        required: true,
      },
      {
        id: "keyTakeaways",
        label: "Key sections / takeaways",
        placeholder: "e.g. Section 1: Midjourney for images, Section 2: Descript for editing…",
        type: "textarea",
        required: true,
      },
      {
        id: "cta",
        label: "End CTA (optional)",
        placeholder: "e.g. Subscribe for weekly AI tool reviews",
        type: "text",
        required: false,
      },
    ],
    buildPrompt: (v) =>
      `Write a YouTube video script about: ${v.topic}. Use a "${v.hookStyle}" hook style. Key sections/takeaways to cover: ${v.keyTakeaways}.${
        v.cta ? ` End CTA: ${v.cta}.` : ""
      } Include: strong hook (first 30 seconds), a promise of what they'll learn, clearly labeled [SECTION] markers, natural spoken-word language, open loops for retention, and smooth transitions.`,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    tagline: "Emails your subscribers actually read",
    description:
      "Write polished email newsletters with a clear structure, valuable content, and a compelling reason to stay subscribed.",
    category: "Content Creation",
    icon: Newspaper,
    accentBg: "bg-amber-100 dark:bg-amber-950",
    accentText: "text-amber-600 dark:text-amber-400",
    contentType: "Email newsletter",
    status: "available",
    defaultLength: { count: 600, unit: "words" },
    fields: [
      {
        id: "subject",
        label: "Subject line / theme",
        placeholder: "e.g. The one productivity habit that changed everything for me",
        type: "text",
        required: true,
      },
      {
        id: "section1",
        label: "Section 1 topic",
        placeholder: "e.g. The main story or insight",
        type: "text",
        required: true,
      },
      {
        id: "section2",
        label: "Section 2 topic",
        placeholder: "e.g. A tip, tool, or resource to share",
        type: "text",
        required: true,
      },
      {
        id: "section3",
        label: "Section 3 topic",
        placeholder: "e.g. A question for readers, or a quick takeaway",
        type: "text",
        required: true,
      },
      {
        id: "sponsor",
        label: "Sponsor / CTA (optional)",
        placeholder: "e.g. Sponsored by Notion — try it free",
        type: "text",
        required: false,
      },
    ],
    buildPrompt: (v) =>
      `Write an email newsletter with the theme: "${v.subject}". Structure it with these three sections: Section 1: ${v.section1} | Section 2: ${v.section2} | Section 3: ${v.section3}.${
        v.sponsor ? ` Include a clearly marked sponsored section for: ${v.sponsor}.` : ""
      } Make it conversational, scannable with short paragraphs, and genuinely valuable — not promotional fluff.`,
  },
  {
    id: "ab-headline",
    name: "A/B Headline Generator",
    tagline: "10 headlines, find the one that wins",
    description:
      "Generate 10 headline variants for any piece of content with rationale for each, so you can test and pick the best performer.",
    category: "Content Creation",
    icon: Type,
    accentBg: "bg-teal-100 dark:bg-teal-950",
    accentText: "text-teal-600 dark:text-teal-400",
    contentType: "Headline variants",
    status: "available",
    defaultLength: { count: 500, unit: "words" },
    fields: [
      {
        id: "topic",
        label: "Topic / content piece",
        placeholder: "e.g. An article about building a $10k/month side business",
        type: "textarea",
        required: true,
      },
      {
        id: "audience",
        label: "Target audience",
        placeholder: "e.g. Aspiring entrepreneurs aged 25–40",
        type: "text",
        required: true,
      },
      {
        id: "contentType",
        label: "Content type",
        placeholder: "",
        type: "select",
        options: [
          "Blog post",
          "Email subject line",
          "YouTube title",
          "Ad headline",
          "Landing page headline",
          "Social media post",
        ],
        required: true,
      },
      {
        id: "goal",
        label: "Goal",
        placeholder: "",
        type: "select",
        options: ["Maximize clicks", "Drive shares", "Generate conversions", "Build curiosity"],
        required: true,
      },
    ],
    buildPrompt: (v) =>
      `Generate exactly 10 compelling headline variants for a ${v.contentType} about: "${v.topic}". Target audience: ${v.audience}. Goal: ${v.goal}. For each headline, write: the headline itself, then a 1-sentence rationale explaining the psychological technique used (curiosity gap, numbers, fear of missing out, social proof, etc.). Format as a numbered list. Vary the techniques across all 10 so each headline feels different.`,
  },
  {
    id: "content-repurposer",
    name: "Content Repurposer",
    tagline: "One piece of content, every platform",
    description:
      "Paste any existing content and automatically get platform-native versions for LinkedIn, Twitter, email, and more.",
    category: "Content Creation",
    icon: RefreshCw,
    accentBg: "bg-indigo-100 dark:bg-indigo-950",
    accentText: "text-indigo-600 dark:text-indigo-400",
    contentType: "Repurposed content",
    status: "available",
    defaultLength: { count: 1000, unit: "words" },
    fields: [
      {
        id: "content",
        label: "Original content (paste here)",
        placeholder: "Paste your blog post, article, talk transcript, or any long-form content…",
        type: "textarea",
        required: true,
      },
      {
        id: "originalFormat",
        label: "Original format",
        placeholder: "",
        type: "select",
        options: [
          "Blog post",
          "Talk / presentation",
          "Podcast transcript",
          "Long-form article",
          "Video transcript",
        ],
        required: true,
      },
      {
        id: "formats",
        label: "Repurpose into",
        placeholder: "",
        type: "select",
        options: [
          "LinkedIn post + Twitter thread + Email newsletter",
          "LinkedIn post + Twitter thread",
          "Twitter thread + Email newsletter",
          "LinkedIn post + Email newsletter",
          "All: LinkedIn + Twitter + Email + Instagram caption",
        ],
        required: true,
      },
    ],
    buildPrompt: (v) =>
      `Repurpose the following ${v.originalFormat} into these formats: ${v.formats}. Original content: ---\n${v.content}\n--- For each output format, preserve the core message but fully adapt the tone, length, structure, and style to feel native on that platform. Separate each version with a clear === FORMAT NAME === header. Do not water down the insights — each version should be as valuable as the original.`,
  },

  // ─── Outreach & Sales ─────────────────────────────────────────────────────
  {
    id: "cold-email",
    name: "Cold Email",
    tagline: "Outreach that actually gets replies",
    description:
      "Write personalized cold emails that cut through the noise and compel recipients to respond.",
    category: "Outreach & Sales",
    icon: Send,
    accentBg: "bg-green-100 dark:bg-green-950",
    accentText: "text-green-600 dark:text-green-400",
    contentType: "Cold outreach email",
    status: "available",
    defaultLength: { count: 200, unit: "words" },
    fields: [
      {
        id: "recipient",
        label: "Recipient name & role",
        placeholder: "e.g. Sarah, Head of Marketing at Acme Corp",
        type: "text",
        required: true,
      },
      {
        id: "offer",
        label: "What are you offering?",
        placeholder: "e.g. AI-powered analytics tool that reduces reporting time by 80%",
        type: "textarea",
        required: true,
      },
      {
        id: "pain",
        label: "Their likely pain point",
        placeholder: "e.g. Spending too much time on manual data analysis",
        type: "text",
        required: true,
      },
      {
        id: "cta",
        label: "Desired next step",
        placeholder: "e.g. 15-min call to show a demo",
        type: "text",
        required: true,
      },
    ],
    buildPrompt: (v) =>
      `Write a cold outreach email to ${v.recipient}. I'm offering: ${v.offer}. Their likely pain point: ${v.pain}. The desired next step (CTA): ${v.cta}. Make it concise (under 150 words), hyper-personalized, value-focused, and not salesy. No fluff, no generic opener like "I hope this email finds you well."`,
  },
  {
    id: "product-description",
    name: "Product Description",
    tagline: "Copy that sells before you say a word",
    description:
      "Write benefit-driven product descriptions optimized for your platform — whether that's Amazon, Shopify, or your own landing page.",
    category: "Outreach & Sales",
    icon: Package,
    accentBg: "bg-orange-100 dark:bg-orange-950",
    accentText: "text-orange-600 dark:text-orange-400",
    contentType: "Product description",
    status: "available",
    defaultLength: { count: 300, unit: "words" },
    fields: [
      {
        id: "productName",
        label: "Product name",
        placeholder: "e.g. AeroFlow Standing Desk Mat",
        type: "text",
        required: true,
      },
      {
        id: "features",
        label: "Key features (3–5 bullet points)",
        placeholder: "e.g. Anti-fatigue foam, non-slip base, 24x36 inches, easy to clean…",
        type: "textarea",
        required: true,
      },
      {
        id: "customer",
        label: "Target customer",
        placeholder: "e.g. Remote workers who stand at their desk for 4+ hours a day",
        type: "text",
        required: true,
      },
      {
        id: "platform",
        label: "Platform",
        placeholder: "",
        type: "select",
        options: ["Amazon", "Shopify / DTC website", "App Store", "Product Hunt", "Landing page"],
        required: true,
      },
      {
        id: "usp",
        label: "Unique selling point",
        placeholder: "e.g. The only mat with a built-in acupressure zone",
        type: "text",
        required: true,
      },
    ],
    buildPrompt: (v) =>
      `Write a product description for "${v.productName}" for the ${v.platform} platform. Target customer: ${v.customer}. Key features: ${v.features}. Unique selling point: ${v.usp}. Write benefit-first (not feature-first), use sensory and emotional language, and optimize for the platform's conventions (e.g. bullet points for Amazon, storytelling for landing pages).`,
  },
  {
    id: "press-release",
    name: "Press Release",
    tagline: "Announcements journalists want to publish",
    description:
      "Write professional press releases in standard AP format that journalists can pick up and publish with minimal edits.",
    category: "Outreach & Sales",
    icon: Megaphone,
    accentBg: "bg-rose-100 dark:bg-rose-950",
    accentText: "text-rose-600 dark:text-rose-400",
    contentType: "Press release",
    status: "available",
    defaultLength: { count: 500, unit: "words" },
    fields: [
      {
        id: "headline",
        label: "Announcement headline",
        placeholder: "e.g. Acme Corp Raises $5M Series A to Expand AI-Powered Logistics Platform",
        type: "text",
        required: true,
      },
      {
        id: "company",
        label: "Company name & description",
        placeholder: "e.g. Acme Corp, a logistics AI startup founded in 2022",
        type: "text",
        required: true,
      },
      {
        id: "details",
        label: "Key details & supporting facts",
        placeholder: "e.g. Led by Sequoia, will be used to hire 50 engineers, expand to EU market…",
        type: "textarea",
        required: true,
      },
      {
        id: "quote",
        label: "Executive quote (name, title & sentiment)",
        placeholder: "e.g. Jane Doe, CEO — excited about growth, mention team and customers",
        type: "text",
        required: true,
      },
    ],
    buildPrompt: (v) =>
      `Write a professional press release announcing: "${v.headline}". Company: ${v.company}. Key details: ${v.details}. Include a compelling quote from ${v.quote}. Follow standard AP press release format: dateline, inverted pyramid structure, boilerplate "About" section, and a ### end marker. Make it newsworthy and ready to publish.`,
  },
  {
    id: "job-description",
    name: "Job Description",
    tagline: "Attract the candidates you actually want",
    description:
      "Write inclusive, compelling job descriptions that attract top talent without reading like a checklist of demands.",
    category: "Outreach & Sales",
    icon: UserPlus,
    accentBg: "bg-cyan-100 dark:bg-cyan-950",
    accentText: "text-cyan-600 dark:text-cyan-400",
    contentType: "Job description",
    status: "available",
    defaultLength: { count: 500, unit: "words" },
    fields: [
      {
        id: "title",
        label: "Job title",
        placeholder: "e.g. Senior Product Designer",
        type: "text",
        required: true,
      },
      {
        id: "company",
        label: "Company name & culture",
        placeholder: "e.g. Notion — async-first, remote, ship fast, high ownership",
        type: "text",
        required: true,
      },
      {
        id: "responsibilities",
        label: "Key responsibilities",
        placeholder: "e.g. Own the design system, lead user research, collaborate with 3 PMs…",
        type: "textarea",
        required: true,
      },
      {
        id: "requirements",
        label: "Must-have vs. nice-to-have requirements",
        placeholder: "e.g. Must: 5+ yrs product design. Nice: experience in B2B SaaS, Figma expertise",
        type: "textarea",
        required: true,
      },
      {
        id: "compensation",
        label: "Compensation & perks (optional)",
        placeholder: "e.g. $130k–$160k, equity, unlimited PTO, $2k home office budget",
        type: "text",
        required: false,
      },
    ],
    buildPrompt: (v) =>
      `Write a job description for a ${v.title} at ${v.company}. Key responsibilities: ${v.responsibilities}. Requirements: ${v.requirements}.${
        v.compensation ? ` Compensation/perks: ${v.compensation}.` : ""
      } Make it warm and compelling — not just a list of demands. Use inclusive language, separate must-haves from nice-to-haves clearly, and sell the role as much as screen for it.`,
  },

  // ─── Business & Strategy ──────────────────────────────────────────────────
  {
    id: "case-study",
    name: "Case Study",
    tagline: "Turn client wins into powerful social proof",
    description:
      "Write data-driven case studies that build trust with prospects and demonstrate the real-world impact of your work.",
    category: "Business & Strategy",
    icon: BarChart2,
    accentBg: "bg-emerald-100 dark:bg-emerald-950",
    accentText: "text-emerald-600 dark:text-emerald-400",
    contentType: "Case study",
    status: "available",
    defaultLength: { count: 800, unit: "words" },
    fields: [
      {
        id: "client",
        label: "Client name / industry",
        placeholder: "e.g. RetailPro, a mid-size e-commerce retailer with 200 employees",
        type: "text",
        required: true,
      },
      {
        id: "problem",
        label: "Problem they faced",
        placeholder: "e.g. Cart abandonment rate of 78%, losing $2M/yr to competitors",
        type: "textarea",
        required: true,
      },
      {
        id: "solution",
        label: "Solution you provided",
        placeholder: "e.g. Implemented AI-driven retargeting + redesigned checkout flow",
        type: "textarea",
        required: true,
      },
      {
        id: "results",
        label: "Measurable results",
        placeholder: "e.g. Cart abandonment dropped to 41%, revenue up 34% in 90 days",
        type: "textarea",
        required: true,
      },
      {
        id: "timeline",
        label: "Timeline",
        placeholder: "e.g. 3-month engagement, Oct–Dec 2024",
        type: "text",
        required: true,
      },
    ],
    buildPrompt: (v) =>
      `Write a case study about working with ${v.client}. The problem they faced: ${v.problem}. The solution provided: ${v.solution}. Results achieved: ${v.results}. Timeline: ${v.timeline}. Structure it as: Executive Summary → The Challenge → Our Approach → Results & Impact → Client Quote (invent a plausible one) → Conclusion. Make it data-driven, credible, and compelling for prospects in a similar situation.`,
  },
  {
    id: "meeting-summary",
    name: "Meeting Summary",
    tagline: "Turn notes into action, fast",
    description:
      "Paste your meeting transcript or notes and get a structured summary with key decisions, action items, and owners.",
    category: "Business & Strategy",
    icon: ClipboardList,
    accentBg: "bg-violet-100 dark:bg-violet-950",
    accentText: "text-violet-600 dark:text-violet-400",
    contentType: "Meeting summary",
    status: "available",
    defaultLength: { count: 400, unit: "words" },
    fields: [
      {
        id: "transcript",
        label: "Meeting transcript or notes",
        placeholder: "Paste your raw meeting notes, transcript, or bullet points here…",
        type: "textarea",
        required: true,
      },
      {
        id: "meetingType",
        label: "Meeting type",
        placeholder: "",
        type: "select",
        options: [
          "Team standup",
          "Sprint planning",
          "Retrospective",
          "Client call",
          "Strategy session",
          "1:1",
          "All-hands",
          "Other",
        ],
        required: true,
      },
      {
        id: "participants",
        label: "Participants / teams",
        placeholder: "e.g. Product (Alice, Bob), Engineering (Carol), Design (Dan)",
        type: "text",
        required: false,
      },
    ],
    buildPrompt: (v) =>
      `Summarize the following ${v.meetingType} meeting${
        v.participants ? ` with participants: ${v.participants}` : ""
      } and extract structured action items.\n\nMeeting notes/transcript:\n---\n${v.transcript}\n---\n\nOutput in this exact format:\n\n## Executive Summary\n(2–3 sentences)\n\n## Key Decisions Made\n(bullet list)\n\n## Action Items\n| Owner | Task | Due Date |\n|-------|------|----------|\n\n## Open Questions / Parking Lot\n(items that need follow-up)\n\nBe concise. Only include what was actually discussed — don't invent details.`,
  },
  {
    id: "seo-brief",
    name: "SEO Content Brief",
    tagline: "Data-backed briefs that rank",
    description:
      "Generate comprehensive SEO content briefs with search intent analysis, suggested structure, and keyword clustering.",
    category: "Business & Strategy",
    icon: Search,
    accentBg: "bg-lime-100 dark:bg-lime-950",
    accentText: "text-lime-600 dark:text-lime-400",
    contentType: "SEO content brief",
    status: "coming-soon",
  },
  {
    id: "pitch-deck",
    name: "Pitch Deck Storyteller",
    tagline: "A narrative investors remember",
    description:
      "Transform your company info into a compelling slide-by-slide pitch deck narrative using proven storytelling frameworks.",
    category: "Business & Strategy",
    icon: PanelTop,
    accentBg: "bg-fuchsia-100 dark:bg-fuchsia-950",
    accentText: "text-fuchsia-600 dark:text-fuchsia-400",
    contentType: "Pitch deck script",
    status: "coming-soon",
  },

  // ─── Career ───────────────────────────────────────────────────────────────
  {
    id: "resume-bullets",
    name: "Resume Bullet Rewriter",
    tagline: "3 stronger versions of any bullet point",
    description:
      "Paste a weak resume bullet and get three powerful, ATS-friendly rewrites — each using a different technique to stand out.",
    category: "Career",
    icon: ListChecks,
    accentBg: "bg-yellow-100 dark:bg-yellow-950",
    accentText: "text-yellow-600 dark:text-yellow-400",
    contentType: "Resume bullet points",
    status: "available",
    defaultLength: { count: 300, unit: "words" },
    fields: [
      {
        id: "bullet",
        label: "Existing bullet point",
        placeholder: "e.g. Responsible for managing the sales team and increasing revenue",
        type: "textarea",
        required: true,
      },
      {
        id: "role",
        label: "Your job title / role",
        placeholder: "e.g. Sales Manager",
        type: "text",
        required: true,
      },
      {
        id: "industry",
        label: "Industry",
        placeholder: "e.g. B2B SaaS",
        type: "text",
        required: true,
      },
    ],
    buildPrompt: (v) =>
      `Rewrite this resume bullet point for a ${v.role} in ${v.industry} — produce exactly 3 strong rewrites:\n\nOriginal: "${v.bullet}"\n\nFor each version: start with a strong action verb, quantify impact where possible (invent plausible numbers if none are given), be ATS-friendly, and keep it under 20 words. Then write 1 sentence explaining the technique used.\n\nFormat:\nVersion 1: [bullet]\nWhy it works: [explanation]\n\nVersion 2: [bullet]\nWhy it works: [explanation]\n\nVersion 3: [bullet]\nWhy it works: [explanation]`,
  },

  // ─── Advanced (Coming Soon) ───────────────────────────────────────────────
  {
    id: "persona-generator",
    name: "Persona-aware Generator",
    tagline: "Content that speaks to one person, perfectly",
    description:
      "Define a detailed fictional audience persona and generate content that speaks directly to their worldview, fears, and motivations.",
    category: "Advanced",
    icon: UserCog,
    accentBg: "bg-pink-100 dark:bg-pink-950",
    accentText: "text-pink-600 dark:text-pink-400",
    contentType: "Persona-targeted content",
    status: "coming-soon",
  },
  {
    id: "wizard-apps",
    name: "Multi-step Wizard",
    tagline: "Full campaigns, built step by step",
    description:
      "Multi-page guided flows for complex outputs — like a full email sequence or complete social media campaign, built through a structured wizard.",
    category: "Advanced",
    icon: Layers,
    accentBg: "bg-gray-100 dark:bg-gray-800",
    accentText: "text-gray-600 dark:text-gray-400",
    contentType: "Multi-step content",
    status: "coming-soon",
  },
];

export const CATEGORIES = [
  "Content Creation",
  "Outreach & Sales",
  "Business & Strategy",
  "Career",
  "Advanced",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function getApp(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id);
}

export function getAppsByCategory(): Map<string, AppDef[]> {
  const map = new Map<string, AppDef[]>();
  for (const cat of CATEGORIES) map.set(cat, []);
  for (const app of APPS) {
    const list = map.get(app.category);
    if (list) list.push(app);
  }
  return map;
}
