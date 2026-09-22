"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { zhCN } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const QUICK_TIMES = ["09:00", "12:00", "18:00", "20:00", "22:00", "23:00"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parse(value: string): { date: Date | undefined; hh: number; mm: number } {
  const [dPart, tPart] = (value || "").split("T");
  let date: Date | undefined;
  if (dPart && /^\d{4}-\d{2}-\d{2}$/.test(dPart)) {
    const [y, m, d] = dPart.split("-").map(Number);
    date = new Date(y, m - 1, d);
  }
  const [hh, mm] = tPart ? tPart.split(":").map(Number) : [20, 0];
  return { date, hh: Number.isFinite(hh) ? hh : 20, mm: Number.isFinite(mm) ? mm : 0 };
}

/** 日期（可选时间）选择器：shadcn Popover + Calendar，替代浏览器原生 date / datetime-local */
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
  const { date, hh, mm } = parse(value);
  const base = date ?? new Date();

  const emit = (d: Date, h: number, mi: number) => {
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    onChange(withTime ? `${ds}T${pad(h)}:${pad(mi)}` : ds);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={`h-8 w-full justify-between font-normal ${className}`}
          />
        }
      >
        <span className={value ? "text-foreground" : "text-muted-foreground/55"}>
          {value ? value.replace("T", " ") : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-muted-foreground/55" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <Calendar
          mode="single"
          locale={zhCN}
          selected={date}
          onSelect={(d) => {
            if (d) emit(d, hh, mm);
          }}
        />
        {withTime && (
          <div className="border-t border-border/60 p-2">
            <div className="mb-1.5 flex flex-wrap gap-1">
              {QUICK_TIMES.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => emit(base, Number(t.split(":")[0]), Number(t.split(":")[1]))}
                  className={
                    value.endsWith(`T${t}`)
                      ? "bg-primary text-primary-foreground hover:bg-primary"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }
                >
                  {t}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {/* flex-col：让选项按钮各占一行，避免行内按钮被排成一行把弹层内在宽度撑到视口宽 */}
              <div className="thin-scroll flex h-32 flex-1 flex-col overflow-y-auto rounded-lg border border-border">
                {Array.from({ length: 24 }, (_, i) => (
                  <Button
                    key={i}
                    type="button"
                    variant="ghost"
                    onClick={() => emit(base, i, mm)}
                    className={`w-full justify-center rounded-none px-2 text-sm ${
                      i === hh
                        ? "bg-primary font-medium text-primary-foreground hover:bg-primary"
                        : "text-secondary-foreground"
                    }`}
                  >
                    {pad(i)} 时
                  </Button>
                ))}
              </div>
              <div className="thin-scroll flex h-32 flex-1 flex-col overflow-y-auto rounded-lg border border-border">
                {Array.from({ length: 60 }, (_, i) => (
                  <Button
                    key={i}
                    type="button"
                    variant="ghost"
                    onClick={() => emit(base, hh, i)}
                    className={`w-full justify-center rounded-none px-2 text-sm ${
                      i === mm
                        ? "bg-primary font-medium text-primary-foreground hover:bg-primary"
                        : "text-secondary-foreground"
                    }`}
                  >
                    {pad(i)} 分
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border/60 p-2">
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => {
              const now = new Date();
              emit(now, now.getHours(), now.getMinutes());
            }}
          >
            今天
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            确定
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
