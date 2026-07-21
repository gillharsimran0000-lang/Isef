import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ArrowCounterClockwise } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';

const SPEEDS = [0.25, 0.5, 1, 2, 4];
/** Full lifecycle plays in ~14 real seconds at 1x. */
const BASE_SECONDS_FOR_FULL_RUN = 14;

export function PlaybackControl({
  day,
  durationDays,
  onDayChange,
}: {
  day: number;
  durationDays: number;
  onDayChange: (day: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef<number>();
  const lastRef = useRef<number>();
  const dayRef = useRef(day);
  dayRef.current = day;

  useEffect(() => {
    if (!playing) return;
    const daysPerSecond = (durationDays / BASE_SECONDS_FOR_FULL_RUN) * speed;

    function tick(now: number) {
      if (lastRef.current === undefined) lastRef.current = now;
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      const next = dayRef.current + dt * daysPerSecond;
      if (next >= durationDays) {
        onDayChange(durationDays);
        setPlaying(false);
        return;
      }
      onDayChange(next);
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      lastRef.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, durationDays]);

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? 'Pause' : 'Play'}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-elevated)] transition-transform duration-150 ease-out-strong active:scale-95"
      >
        <span
          className="absolute transition-all duration-150 ease-out-strong"
          style={{ opacity: playing ? 1 : 0, transform: playing ? 'scale(1)' : 'scale(0.7)' }}
        >
          <Pause size={16} weight="fill" />
        </span>
        <span
          className="absolute transition-all duration-150 ease-out-strong"
          style={{ opacity: playing ? 0 : 1, transform: playing ? 'scale(0.7)' : 'scale(1)' }}
        >
          <Play size={16} weight="fill" />
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          setPlaying(false);
          onDayChange(0);
        }}
        aria-label="Reset to day 0"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowCounterClockwise size={15} />
      </button>

      <input
        type="range"
        min={0}
        max={durationDays}
        step={0.1}
        value={day}
        onChange={(e) => {
          setPlaying(false);
          onDayChange(Number(e.target.value));
        }}
        className="min-w-[140px] flex-1 accent-[var(--color-accent)]"
        aria-label="Day"
      />
      <span className="w-20 shrink-0 text-right font-mono text-sm tabular-nums text-[var(--text-primary)]">
        Day {day.toFixed(1)}
      </span>

      <div className="flex shrink-0 gap-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`rounded-md px-2 py-1 font-mono text-xs transition-colors ${
              speed === s ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </Card>
  );
}
