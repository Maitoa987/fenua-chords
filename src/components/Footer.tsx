export function Footer() {
  return (
    <footer className="border-t border-primary/10 bg-surface/50 py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm text-text-muted">
        Fenua Chords &copy; {new Date().getFullYear()}
      </div>
    </footer>
  );
}
