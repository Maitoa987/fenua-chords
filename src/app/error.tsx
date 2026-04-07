"use client";

import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="font-heading text-6xl text-primary">Oups</h1>
        <p className="text-muted-foreground text-lg">Quelque chose s&apos;est mal passe.</p>
        <Button onClick={reset} className="mt-4">
          Reessayer
        </Button>
      </div>
    </main>
  );
}
