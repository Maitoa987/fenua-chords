"use client";

interface ErrorPageProps {
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="font-heading text-6xl text-text">Oups</h1>
        <p className="text-text-muted text-lg">Quelque chose s&apos;est mal passe.</p>
        <button
          onClick={reset}
          className="mt-4 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
        >
          Reessayer
        </button>
      </div>
    </main>
  );
}
