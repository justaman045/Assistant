"use client";

import Link from "next/link";
import { getAppsByCategory, isAvailable } from "@/lib/apps";
import { ArrowRight, Clock } from "lucide-react";

const appsByCategory = getAppsByCategory();

export default function AppsPage() {
  return (
    <div className="flex flex-col gap-10 pt-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Apps</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Focused content generation tools, each built for a specific format and goal.
        </p>
      </div>

      {Array.from(appsByCategory.entries()).map(([category, apps]) => (
        <section key={category}>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {category}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => {
              const Icon = app.icon;
              const available = isAvailable(app);

              if (!available) {
                return (
                  <div
                    key={app.id}
                    className="flex flex-col gap-4 rounded-2xl border border-dashed border-gray-200/80 bg-gray-50/40 p-5 opacity-60 dark:border-gray-700/60 dark:bg-gray-900/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${app.accentBg}`}>
                        <Icon className={`h-5 w-5 ${app.accentText}`} size={20} />
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        Coming soon
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {app.name}
                      </h3>
                      <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                        {app.tagline}
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                      {app.description}
                    </p>
                  </div>
                );
              }

              return (
                <Link
                  key={app.id}
                  href={`/content/apps/${app.id}`}
                  className="group flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_8px_24px_-4px_rgb(99_102_241/0.12)] dark:border-gray-700/80 dark:bg-gray-900 dark:hover:border-indigo-800"
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${app.accentBg}`}>
                      <Icon className={`h-5 w-5 ${app.accentText}`} size={20} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-gray-600 dark:group-hover:text-indigo-400" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {app.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {app.tagline}
                    </p>
                  </div>

                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {app.description}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {app.fields.filter((f) => f.required).length} required fields
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      ~{app.defaultLength.count} {app.defaultLength.unit}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
