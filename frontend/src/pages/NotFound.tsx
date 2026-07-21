import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-base)] px-6 text-center">
      <span className="font-mono text-sm text-[var(--text-faint)]">404</span>
      <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
        This reactor doesn't exist.
      </h1>
      <p className="max-w-sm text-sm text-[var(--text-secondary)]">
        There's one pile in PILENGINE, and it isn't at this address.
      </p>
      <Link to="/dashboard">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
