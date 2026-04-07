"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Mode = "login" | "signup" | "magic-link";

export default function ConnexionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
      }
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Vérifie ta boite mail pour confirmer ton compte.");
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Lien de connexion envoyé ! Vérifie ta boite mail.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl border border-primary/10 p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl text-primary mb-2">
              {mode === "login" && "Connexion"}
              {mode === "signup" && "Créer un compte"}
              {mode === "magic-link" && "Lien magique"}
            </h1>
            <p className="text-text-muted text-sm">
              {mode === "login" && "Accède à ta bibliothèque d'accords"}
              {mode === "signup" && "Rejoins la communauté Fenua Chords"}
              {mode === "magic-link" && "Connexion sans mot de passe"}
            </p>
          </div>

          {/* Mode switcher */}
          <div className="flex gap-1 bg-background rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                mode === "login" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-primary"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                mode === "signup" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-primary"
              }`}
            >
              Inscription
            </button>
            <button
              type="button"
              onClick={() => { setMode("magic-link"); setError(null); setSuccess(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                mode === "magic-link" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-primary"
              }`}
            >
              Lien magique
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password (not in magic-link mode) */}
            {mode !== "magic-link" && (
              <div className="space-y-1">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success */}
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? "Chargement..."
                : mode === "login"
                ? "Se connecter"
                : mode === "signup"
                ? "Créer mon compte"
                : "Envoyer le lien"}
            </Button>
          </form>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className={buttonVariants({ variant: "link" })}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
