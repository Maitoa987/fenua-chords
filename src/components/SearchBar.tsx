"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  placeholder?: string;
  paramName?: string;
  basePath?: string;
  debounceMs?: number;
}

export function SearchBar({
  placeholder = "Rechercher...",
  paramName = "q",
  basePath,
  debounceMs = 300,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const target = basePath ?? pathname;

  function pushSearch(searchValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue.trim()) {
      params.set(paramName, searchValue.trim());
    } else {
      params.delete(paramName);
    }
    // Reset to page 1 on new search
    params.delete("page");
    const qs = params.toString();
    router.push(`${target}${qs ? `?${qs}` : ""}`);
  }

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const current = searchParams.get(paramName) ?? "";
      if (value.trim() !== current) {
        pushSearch(value);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    pushSearch(value);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-10 pr-4 py-2.5 h-auto rounded-xl border-primary/20 bg-card text-foreground placeholder:text-muted-foreground"
      />
    </form>
  );
}
