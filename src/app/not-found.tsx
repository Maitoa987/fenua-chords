import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="font-heading text-6xl text-text">404</h1>
        <p className="text-text-muted text-lg">Cette page n&apos;existe pas.</p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
        >
          Retour a l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
