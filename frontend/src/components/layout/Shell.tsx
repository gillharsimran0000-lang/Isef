import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { TopBar } from './TopBar';

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} />
        <main className="flex-1 px-5 pb-24 pt-6 sm:px-8 sm:pb-10">
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto flex max-w-6xl flex-col gap-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
