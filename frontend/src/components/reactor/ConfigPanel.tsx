import type { AerationMode, PileConfig } from '@pilengine/simulation-engine';
import { Card } from '@/components/ui/Card';

const AERATION_OPTIONS: { value: AerationMode; label: string; hint: string }[] = [
  { value: 'passive', label: 'Passive', hint: 'No mechanical assist; relies on natural convection.' },
  { value: 'turned', label: 'Turned', hint: 'Periodic turning replenishes oxygen and vents heat.' },
  { value: 'forced', label: 'Forced', hint: 'Blower-driven; strongest O2 supply, strips heat as vapour.' },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--text-faint)]">{hint}</span>}
    </label>
  );
}

const inputClass =
  'rounded-md border border-[var(--border)] bg-[var(--bg-well)] px-3 py-2 text-sm text-[var(--text-primary)]';

export function ConfigPanel({
  config,
  onChange,
}: {
  config: PileConfig;
  onChange: (patch: Partial<PileConfig>) => void;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">Operating Conditions</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Ambient Temperature" hint="Outdoor air temperature, °C.">
          <input
            type="number"
            value={config.ambientC}
            onChange={(e) => onChange({ ambientC: Number(e.target.value) })}
            className={inputClass}
          />
        </Field>

        <Field label="Aeration Mode">
          <select
            value={config.aeration}
            onChange={(e) => onChange({ aeration: e.target.value as AerationMode })}
            className={inputClass}
          >
            {AERATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Turn Interval" hint="Days between turning events. 0 = never turned.">
          <input
            type="number"
            min={0}
            value={config.turnIntervalDays}
            onChange={(e) => onChange({ turnIntervalDays: Number(e.target.value) })}
            className={inputClass}
          />
        </Field>

        <Field label="Pile Height" hint="Characteristic height, metres. Sets the O2 diffusion path length.">
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={config.heightM}
            onChange={(e) => onChange({ heightM: Number(e.target.value) })}
            className={inputClass}
          />
        </Field>

        <Field label="Insulation" hint={`0 = bare thin pile, 1 = well-insulated vessel (${config.insulation.toFixed(2)}).`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.insulation}
            onChange={(e) => onChange({ insulation: Number(e.target.value) })}
            className="accent-[var(--color-accent)]"
          />
        </Field>

        <Field label="Q10 Coefficient" hint="Biological rate temperature sensitivity. Literature: 2–3.">
          <input
            type="number"
            min={1}
            max={4}
            step={0.1}
            value={config.q10}
            onChange={(e) => onChange({ q10: Number(e.target.value) })}
            className={inputClass}
          />
        </Field>

        <Field label="Simulation Duration" hint="Days to simulate.">
          <input
            type="number"
            min={10}
            step={5}
            value={config.durationDays}
            onChange={(e) => onChange({ durationDays: Number(e.target.value) })}
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2.5 self-end pb-2">
          <input
            type="checkbox"
            checked={config.moistureManaged}
            onChange={(e) => onChange({ moistureManaged: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          <span className="text-sm font-medium text-[var(--text-primary)]">Moisture actively managed</span>
        </label>
      </div>

      <p className="mt-4 text-xs text-[var(--text-faint)]">
        {AERATION_OPTIONS.find((o) => o.value === config.aeration)?.hint}
      </p>
    </Card>
  );
}
