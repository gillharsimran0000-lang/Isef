import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { TopBar } from './TopBar';

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} />
        <main className="flex-1 px-5 pb-24 pt-6 sm:px-8 sm:pb-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
