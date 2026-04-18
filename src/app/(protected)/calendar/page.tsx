"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Item } from "@/lib/types";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "items"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    getDocs(q)
      .then((snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) })));
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Group items by day-of-month for current month/year
  const byDay: Record<number, Item[]> = {};
  for (const item of items) {
    const d = item.createdAt?.toDate();
    if (!d) continue;
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      byDay[day] = [...(byDay[day] ?? []), item];
    }
  }

  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const itemsThisMonth = Object.values(byDay).flat().length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Content Calendar</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your saved content organised by date.
        </p>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
        <button
          onClick={prevMonth}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {MONTH_NAMES[month]} {year}
          </p>
          {!loading && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {itemsThisMonth} {itemsThisMonth === 1 ? "item" : "items"} this month
            </p>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-800">
          {/* Empty cells before start */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/50 dark:bg-gray-800/20" />
          ))}

          {days.map((day) => {
            const dayItems = byDay[day] ?? [];
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();

            return (
              <div
                key={day}
                className={`min-h-[80px] p-1.5 ${isToday ? "bg-indigo-50/60 dark:bg-indigo-950/30" : ""}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {day}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayItems.slice(0, 3).map((item) => (
                    <Link
                      key={item.id}
                      href="/history"
                      className="block truncate rounded px-1 py-0.5 text-xs text-indigo-700 transition-colors hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
                      title={item.title}
                    >
                      {item.title}
                    </Link>
                  ))}
                  {dayItems.length > 3 && (
                    <p className="px-1 text-xs text-gray-400 dark:text-gray-500">
                      +{dayItems.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {!loading && itemsThisMonth === 0 && (
        <div className="rounded-xl bg-white py-12 text-center shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No content saved in {MONTH_NAMES[month]}.
          </p>
          <Link
            href="/create"
            className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Create something →
          </Link>
        </div>
      )}
    </div>
  );
}
