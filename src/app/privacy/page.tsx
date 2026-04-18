import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Personal Dashboard",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100">Personal Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: April 17, 2026</p>

        <div className="prose-section mt-10 space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">1. What we collect</h2>
            <p>
              When you sign in with Google, we receive your name, email address, and profile picture
              from Google. We store these in our database to identify your account.
            </p>
            <p className="mt-3">
              We also collect the content you generate, save, and edit within the app, along with
              usage metadata (model used, token counts, timestamps) and the memory facts the app
              extracts from your sessions to personalize future outputs.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">2. How we use your data</h2>
            <ul className="ml-4 list-disc space-y-1.5">
              <li>To authenticate you and display your content across sessions.</li>
              <li>To generate AI content tailored to your style and history.</li>
              <li>To track credit usage and process payments via Razorpay.</li>
              <li>To improve reliability by logging errors (anonymised stack traces) to our database.</li>
            </ul>
            <p className="mt-3">
              We do not sell your data to third parties and do not use it to train AI models.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">3. Third-party services</h2>
            <ul className="ml-4 list-disc space-y-1.5">
              <li>
                <strong>Firebase (Google)</strong> — authentication, database, and analytics.
                Governed by{" "}
                <a
                  href="https://firebase.google.com/support/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline dark:text-indigo-400"
                >
                  Firebase&apos;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>OpenRouter</strong> — routes your prompts to AI models. Your prompt content
                is sent to OpenRouter and the selected model provider. Review{" "}
                <a
                  href="https://openrouter.ai/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline dark:text-indigo-400"
                >
                  OpenRouter&apos;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Razorpay</strong> — payment processing. We do not store payment card
                details. See{" "}
                <a
                  href="https://razorpay.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline dark:text-indigo-400"
                >
                  Razorpay&apos;s Privacy Policy
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">4. Data retention</h2>
            <p>
              Your account data is retained as long as your account exists. You can delete
              individual saved items and memories at any time from within the app. To delete your
              entire account and all associated data, contact us at the address below.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">5. Security</h2>
            <p>
              All data is stored in Firebase with server-side authentication verification on every
              API request. We use HTTPS for all communications. No security system is perfect, but
              we take reasonable precautions to protect your information.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">6. Contact</h2>
            <p>
              Questions about this policy? Email us at{" "}
              <a
                href="mailto:developerlife69@gmail.com"
                className="text-indigo-600 underline dark:text-indigo-400"
              >
                developerlife69@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6 dark:border-gray-800">
          <Link
            href="/"
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
