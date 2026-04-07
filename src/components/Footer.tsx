import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="bg-surface/50 py-6 mt-auto">
      <Separator className="mb-6" />
      <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
        Fenua Chords &copy; {new Date().getFullYear()}
      </div>
    </footer>
  );
}
