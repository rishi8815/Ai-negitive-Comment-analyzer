"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

import { AnalysisResults } from "./AnalysisResults";

/* ── icons as small components ─────────────────── */
function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.414-5.879a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.07 8.621" />
    </svg>
  );
}

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function IconLoader({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

/* ── step data ────────────────────────────────── */
const STEPS = [
  { num: "01", label: "Paste Link", desc: "Instagram post or reel URL" },
  { num: "02", label: "Scrape", desc: "Apify extracts every comment" },
  { num: "03", label: "Analyze", desc: "Gemini AI reads sentiment" },
  { num: "04", label: "Report", desc: "Negative comments → JSON" },
];

const CATEGORIES = [
  "Hate speech",
  "Harassment",
  "Spam",
  "Offensive language",
  "Trolling",
  "Cyberbullying",
];

/* ── page ──────────────────────────────────────── */
export default function Home() {
  const [postUrl, setPostUrl] = useState("");
  const [commentLimit, setCommentLimit] = useState([100]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [progress, setProgress] = useState("");

  const handleAnalyze = async () => {
    if (!postUrl.trim()) {
      setError("Please enter an Instagram post or reel URL");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setProgress("Scraping comments…");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postUrl, commentLimit: commentLimit[0] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResults(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const reset = () => {
    setResults(null);
    setError(null);
    setPostUrl("");
  };

  /* ── results view ──────────────────────────── */
  if (results) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <AnalysisResults results={results} onReset={reset} />
        </main>
      </div>
    );
  }

  /* ── input view ────────────────────────────── */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        {/* hero */}
        <div className="text-center max-w-2xl mx-auto mb-12 animate-enter-up">
          <Badge variant="secondary" className="mb-4 font-mono text-xs tracking-wider uppercase">
            AI · Sentiment · Instagram
          </Badge>
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-[var(--font-display)] tracking-tight leading-[1.1] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Detect Negative<br />
            <span className="text-muted-foreground">Comments Instantly</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Paste any Instagram post or reel link. We scrape every comment, run
            Gemini AI sentiment analysis, and surface the toxic ones.
          </p>
        </div>

        {/* form card */}
        <Card className="w-full max-w-lg animate-enter-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Analyze a Post</CardTitle>
            <CardDescription>Enter the URL and choose how many comments to scan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* url */}
            <div className="space-y-2">
              <Label htmlFor="url">Instagram URL</Label>
              <div className="relative">
                <IconLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="url"
                  placeholder="https://www.instagram.com/p/..."
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            {/* slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Comments to scan</Label>
                <span className="font-mono text-sm text-muted-foreground">{commentLimit[0]}</span>
              </div>
              <Slider
                min={10}
                max={500}
                step={10}
                value={commentLimit}
                onValueChange={setCommentLimit}
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>10</span>
                <span>500</span>
              </div>
            </div>

            {/* error */}
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* loading state */}
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-chart-2 animate-pulse-dot" />
                  <p className="text-sm text-muted-foreground">{progress}</p>
                </div>
                <Progress value={33} className="h-1" />
              </div>
            )}

            <Separator />

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full h-12 text-base"
              size="lg"
            >
              {loading ? (
                <>
                  <IconLoader className="mr-2 h-4 w-4" />
                  Analyzing…
                </>
              ) : (
                <>
                  <IconSparkle className="mr-2 h-4 w-4" />
                  Start Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* bottom info */}
        <div className="w-full max-w-3xl mt-16 animate-enter-up" style={{ animationDelay: "0.2s" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STEPS.map((s) => (
              <div key={s.num} className="group text-center space-y-2 p-4">
                <span className="block font-mono text-xs text-muted-foreground">{s.num}</span>
                <p className="font-medium text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <Separator className="my-8" />

          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <Badge key={c} variant="outline" className="font-normal text-xs">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── nav bar ───────────────────────────────────── */
function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
            <svg className="h-4 w-4 text-background" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight">Sentinel</span>
        </div>
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-chart-2 inline-block animate-pulse-dot" />
          Online
        </Badge>
      </div>
    </header>
  );
}
