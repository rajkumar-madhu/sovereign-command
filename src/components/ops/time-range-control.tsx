import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type TimeRange = {
  from: Date;
  to: Date;
};

export type TimeRangePreset = {
  id: string;
  label: string;
  range: TimeRange;
};

/** Default investigation window for inc-4821 seed evidence. */
export const INCIDENT_DAY = "2026-08-02";

export const DEFAULT_INCIDENT_RANGE: TimeRange = {
  from: new Date("2026-08-02T06:30:00Z"),
  to: new Date("2026-08-02T06:50:00Z"),
};

export const TIME_RANGE_PRESETS: TimeRangePreset[] = [
  {
    id: "incident",
    label: "Incident window",
    range: DEFAULT_INCIDENT_RANGE,
  },
  {
    id: "onset",
    label: "Onset (06:35–06:45)",
    range: {
      from: new Date("2026-08-02T06:35:00Z"),
      to: new Date("2026-08-02T06:45:00Z"),
    },
  },
  {
    id: "full-day",
    label: "Full day 2 Aug",
    range: {
      from: new Date("2026-08-02T00:00:00Z"),
      to: new Date("2026-08-02T23:59:59Z"),
    },
  },
  {
    id: "prev-day",
    label: "Previous day 1 Aug",
    range: {
      from: new Date("2026-08-01T00:00:00Z"),
      to: new Date("2026-08-01T23:59:59Z"),
    },
  },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** datetime-local value in local timezone */
export function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatRangeLabel(range: TimeRange): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${range.from.toLocaleString(undefined, opts)} → ${range.to.toLocaleString(undefined, opts)}`;
}

export function inTimeRange(ts: Date | number | null | undefined, range: TimeRange): boolean {
  if (ts == null) return false;
  const t = typeof ts === "number" ? ts : ts.getTime();
  if (Number.isNaN(t)) return false;
  return t >= range.from.getTime() && t <= range.to.getTime();
}

/** Resolve clock strings like "06:32" or "06:38:09" onto a day (UTC). */
export function resolveClockOnDay(dayYmd: string, clock: string): Date | null {
  const parts = clock.trim().split(":").map((p) => Number(p));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [hh, mm, ss = 0] = parts;
  const iso = `${dayYmd}T${pad(hh!)}:${pad(mm!)}:${pad(ss!)}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const ISO_IN_LINE =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z|\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/;

/** Try to pull a timestamp from a log line. */
export function parseTimestampFromLine(line: string, dayYmd = INCIDENT_DAY): Date | null {
  const iso = line.match(ISO_IN_LINE);
  if (iso) {
    const normalized = iso[0].includes("T") ? iso[0] : iso[0].replace(" ", "T");
    const withZ = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
    const d = new Date(withZ);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const clock = line.match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/);
  if (clock) return resolveClockOnDay(dayYmd, clock[1]!);
  return null;
}

export function filterLogLines(
  logs: string | undefined,
  range: TimeRange,
  dayYmd = INCIDENT_DAY,
): string {
  if (!logs) return "";
  const lines = logs.split("\n");
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith("#") || trimmed.startsWith("{") || trimmed.startsWith("}")) return true;
    const ts = parseTimestampFromLine(line, dayYmd);
    if (!ts) return true; // keep untimed context lines
    return inTimeRange(ts, range);
  });
  return kept.join("\n");
}

export function filterSeriesByClock<T extends { t: string }>(
  series: T[] | undefined,
  range: TimeRange,
  dayYmd = INCIDENT_DAY,
): T[] {
  if (!series?.length) return [];
  return series.filter((p) => {
    const ts = resolveClockOnDay(dayYmd, p.t);
    return ts ? inTimeRange(ts, range) : true;
  });
}

type TimeRangeControlProps = {
  value: TimeRange;
  onChange: (next: TimeRange, presetId: string) => void;
  presetId: string;
  className?: string;
  compact?: boolean;
};

export function TimeRangeControl({
  value,
  onChange,
  presetId,
  className,
  compact,
}: TimeRangeControlProps) {
  const [customFrom, setCustomFrom] = useState(toLocalInputValue(value.from));
  const [customTo, setCustomTo] = useState(toLocalInputValue(value.to));

  const label = useMemo(() => formatRangeLabel(value), [value]);

  function applyCustom() {
    const from = fromLocalInputValue(customFrom);
    const to = fromLocalInputValue(customTo);
    if (!from || !to || from.getTime() > to.getTime()) return;
    onChange({ from, to }, "custom");
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-surface/70 p-4",
        className,
      )}
      aria-label="Time range"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-brand-coral" aria-hidden />
          <div>
            <p className="text-sm font-medium">History window</p>
            <p className="font-mono text-[11px] text-muted-foreground">{label}</p>
          </div>
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            Filters timeline, logs, and load graphs by time
          </p>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {TIME_RANGE_PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={presetId === p.id ? "default" : "outline"}
            className={presetId === p.id ? "bg-brand-coral text-white hover:bg-brand-coral/90" : ""}
            onClick={() => {
              setCustomFrom(toLocalInputValue(p.range.from));
              setCustomTo(toLocalInputValue(p.range.to));
              onChange(p.range, p.id);
            }}
          >
            {p.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={presetId === "custom" ? "default" : "outline"}
          className={presetId === "custom" ? "bg-brand-coral text-white hover:bg-brand-coral/90" : ""}
          onClick={() => onChange(value, "custom")}
        >
          Custom date
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="range-from" className="text-[11px] uppercase tracking-wide text-muted-foreground">
            From
          </Label>
          <Input
            id="range-from"
            type="datetime-local"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              onChange(
                {
                  from: fromLocalInputValue(e.target.value) ?? value.from,
                  to: fromLocalInputValue(customTo) ?? value.to,
                },
                "custom",
              );
            }}
            className="bg-background font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="range-to" className="text-[11px] uppercase tracking-wide text-muted-foreground">
            To
          </Label>
          <Input
            id="range-to"
            type="datetime-local"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              onChange(
                {
                  from: fromLocalInputValue(customFrom) ?? value.from,
                  to: fromLocalInputValue(e.target.value) ?? value.to,
                },
                "custom",
              );
            }}
            className="bg-background font-mono text-xs"
          />
        </div>
        <Button type="button" variant="outline" onClick={applyCustom} className="sm:mb-0.5">
          Apply
        </Button>
      </div>
    </div>
  );
}
