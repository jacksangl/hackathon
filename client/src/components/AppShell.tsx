import { ReactNode } from "react";

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mutedForeground">AI Career Copilot</p>
            <h1 className="text-xl font-semibold text-foreground">Resume Optimization Workspace</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
};
