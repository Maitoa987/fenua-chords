import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="text-center space-y-4">
        <h1 className="font-heading text-6xl text-primary">404</h1>
        <p className="text-muted-foreground text-lg">Cette page n&apos;existe pas.</p>
        <Link href="/" className={buttonVariants({ variant: "default", className: "mt-4" })}>
          Retour a l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
