"use client";

import { useEffect, useRef, useState } from "react";

const WEEK = ["一", "二", "三", "四", "五", "六", "日"];
const QUICK_TIMES = ["09:00", "12:00", "18:00", "20:00", "22:00", "23:00"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

/** 当月第一天是星期几（周一 = 0） */
function firstWeekday(y: number, m: number) {
  return (new Date(y, m, 1).getDay() + 6) % 7;
}

/** 自定义日期（可选时间）选择器，替代浏览器原生 date / datetime-local */
export default function DateTimePicker({
  value,
  onChange,
  withTime = false,
  placeholder = "选择日期",
  className = "",
}: {
  value: string; // "YYYY-MM-DD" 或 "YYYY-MM-DDTHH:mm"
  onChange: (v: string) => void;
  withTime?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 解析当前值
  const [dPart, tPart] = (value || "").split("T");
  const [vy, vm] = dPart ? dPart.split("-").map(Number) : [NaN, NaN];
  const hasDate = Number.isFinite(vy) && Number.isFinite(vm);
  const [hh, mm] = tPart ? tPart.split(":").map(Number) : [20, 0];
  const day = hasDate ? Number(dPart.split("-")[2]) : NaN;

  // 日历视图月份（默认跟随当前值，打开时再同步）
  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openPanel = () => {
    if (hasDate) {
      setViewY(vy);
      setViewM(vm - 1);
    } else {
      setViewY(now.getFullYear());
      setViewM(now.getMonth());
    }
    setOpen(true);
  };

  const emit = (y: number, m: number, d: number, h: number, mi: number) => {
    const date = `${y}-${pad(m + 1)}-${pad(d)}`;
    onChange(withTime ? `${date}T${pad(h)}:${pad(mi)}` : date);
  };

  const pickDay = (d: number) => {
    emit(viewY, viewM, d, hh, mm);
    if (!withTime) setOpen(false);
  };

  const shiftMonth = (delta: number) => {
    let y = viewY;
    let m = viewM + delta;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    setViewY(y);
    setViewM(m);
  };

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday(viewY, viewM)).fill(null),
    ...Array.from({ length: daysInMonth(viewY, viewM) }, (_, i) => i + 1),
  ];

  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={openPanel}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
          open ? "border-gray-500 bg-white" : "border-gray-300 bg-white hover:border-gray-400"
        }`}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value ? value.replace("T", " ") : placeholder}
        </span>
        <svg className="h-4 w-4 text-gray-400" viewBox="0 0 16 16" fill="none">
          <rect
            x="2"
            y="3"
            width="12"
            height="11"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          {/* 月份导航 */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
            >
              ‹
            </button>
            <span className="text-sm font-medium">
              {viewY} 年 {viewM + 1} 月
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
            >
              ›
            </button>
          </div>

          {/* 星期头 */}
          <div className="mt-2 grid grid-cols-7 text-center text-xs text-gray-400">
            {WEEK.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
            {cells.map((d, i) => {
              if (d === null) return <span key={`x${i}`} />;
              const isSel = hasDate && viewY === vy && viewM === vm - 1 && d === day;
              const isToday = `${viewY}-${viewM + 1}-${d}` === todayStr;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => pickDay(d)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isSel
                      ? "bg-gray-900 font-medium text-white"
                      : isToday
                        ? "border border-gray-300 text-gray-900 hover:bg-gray-100"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* 时间选择 */}
          {withTime && (
            <div className="mt-2 border-t border-gray-100 pt-2">
              <div className="mb-1.5 flex flex-wrap gap-1">
                {QUICK_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const [qh, qm] = t.split(":").map(Number);
                      if (hasDate) emit(vy, vm - 1, day, qh, qm);
                    }}
                    className={`rounded-md px-2 py-0.5 text-xs ${
                      tPart === t
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="thin-scroll h-32 flex-1 overflow-y-auto rounded-lg border border-gray-200">
                  {Array.from({ length: 24 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => hasDate && emit(vy, vm - 1, day, i, mm)}
                      className={`block w-full px-2 py-1.5 text-center text-sm transition-colors hover:bg-gray-50 ${
                        i === hh ? "bg-gray-900 font-medium text-white" : "text-gray-700"
                      }`}
                    >
                      {pad(i)} 时
                    </button>
                  ))}
                </div>
                <div className="thin-scroll h-32 flex-1 overflow-y-auto rounded-lg border border-gray-200">
                  {Array.from({ length: 60 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => hasDate && emit(vy, vm - 1, day, hh, i)}
                      className={`block w-full px-2 py-1.5 text-center text-sm transition-colors hover:bg-gray-50 ${
                        i === mm ? "bg-gray-900 font-medium text-white" : "text-gray-700"
                      }`}
                    >
                      {pad(i)} 分
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 底部操作 */}
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => emit(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm)}
              className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              今天
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-700"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
