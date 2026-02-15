"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/* ── types ────────────────────────────────────── */
interface NegativeComment {
    id: string;
    username: string;
    text: string;
    timestamp: string;
    likes: number;
    reason: string;
    severity: "mild" | "moderate" | "severe";
    categories: string[];
}

interface SimpleComment {
    id: string;
    username: string;
    text: string;
    timestamp: string;
    likes: number;
}

export interface AnalysisData {
    metadata: {
        postUrl: string;
        postId: string;
        analysisTimestamp: string;
        totalCommentsScraped: number;
        negativeCommentsFound: number;
        positiveCommentsFound: number;
        neutralCommentsFound: number;
    };
    statistics: {
        totalComments: number;
        negativePercentage: string;
        positivePercentage: string;
        neutralPercentage: string;
    };
    severityBreakdown: {
        mild: number;
        moderate: number;
        severe: number;
    };
    negativeComments: NegativeComment[];
    allComments: SimpleComment[];
}

interface Props {
    results: AnalysisData;
    onReset: () => void;
}

/* ── severity palette ─────────────────────────── */
const SEV: Record<string, { badge: "default" | "secondary" | "destructive" | "outline"; dot: string }> = {
    mild: { badge: "secondary", dot: "bg-chart-3" },
    moderate: { badge: "outline", dot: "bg-chart-5" },
    severe: { badge: "destructive", dot: "bg-destructive" },
};

const PAGE_SIZE = 50;

/* ── component ────────────────────────────────── */
export function AnalysisResults({ results, onReset }: Props) {
    const [category, setCategory] = useState("all");
    const [severity, setSeverity] = useState("all");
    const [search, setSearch] = useState("");

    // Tab: "all" shows all comments, "negative" shows negative only
    const [activeTab, setActiveTab] = useState<"all" | "negative">("all");

    // Pagination for all comments
    const [allCommentsPage, setAllCommentsPage] = useState(1);
    const [allCommentsSearch, setAllCommentsSearch] = useState("");

    const allCategories = Array.from(
        new Set(results.negativeComments.flatMap((c) => c.categories))
    );

    // ── filtered negative comments ──────────────
    const filteredNegative = results.negativeComments.filter((c) => {
        if (category !== "all" && !c.categories.includes(category)) return false;
        if (severity !== "all" && c.severity !== severity) return false;
        if (search && !c.text.toLowerCase().includes(search.toLowerCase()) && !c.username.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // ── filtered + paginated all comments ───────
    const allComments = results.allComments || [];
    const filteredAll = allComments.filter((c) => {
        if (!allCommentsSearch) return true;
        return (
            c.text.toLowerCase().includes(allCommentsSearch.toLowerCase()) ||
            c.username.toLowerCase().includes(allCommentsSearch.toLowerCase())
        );
    });
    const totalPages = Math.max(1, Math.ceil(filteredAll.length / PAGE_SIZE));
    const paginatedAll = filteredAll.slice(
        (allCommentsPage - 1) * PAGE_SIZE,
        allCommentsPage * PAGE_SIZE
    );

    // Reset page when search changes
    const handleAllSearch = (val: string) => {
        setAllCommentsSearch(val);
        setAllCommentsPage(1);
    };

    const download = () => {
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `sentinel-report-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const pct = (n: number) => {
        const total = results.statistics.totalComments;
        return total > 0 ? ((n / total) * 100).toFixed(1) : "0";
    };

    return (
        <div className="space-y-8 animate-enter-up">
            {/* ── header bar ─────────────────────────── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-mono text-xs text-muted-foreground mb-1">
                        {new Date(results.metadata.analysisTimestamp).toLocaleString()}
                    </p>
                    <h2
                        className="text-3xl sm:text-4xl tracking-tight leading-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Analysis Complete
                    </h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={download}>
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Export JSON
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onReset}>
                        New Analysis
                    </Button>
                </div>
            </div>

            {/* ── metrics row ────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Total" value={results.statistics.totalComments} accent="foreground" />
                <MetricCard label="Negative" value={results.metadata.negativeCommentsFound} sub={`${pct(results.metadata.negativeCommentsFound)}%`} accent="destructive" />
                <MetricCard label="Positive" value={results.metadata.positiveCommentsFound} sub={`${pct(results.metadata.positiveCommentsFound)}%`} accent="chart-2" />
                <MetricCard label="Neutral" value={results.metadata.neutralCommentsFound} sub={`${pct(results.metadata.neutralCommentsFound)}%`} accent="muted-foreground" />
            </div>

            {/* ── severity breakdown ─────────────────── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Severity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                        {(["mild", "moderate", "severe"] as const).map((s) => (
                            <div key={s} className="rounded-lg border p-4 text-center space-y-1">
                                <span className={`inline-block h-2 w-2 rounded-full ${SEV[s].dot}`} />
                                <p className="text-2xl font-semibold tabular-nums">{results.severityBreakdown[s]}</p>
                                <p className="text-xs text-muted-foreground capitalize">{s}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── tab switcher ───────────────────────── */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
                <button
                    onClick={() => setActiveTab("all")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "all"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    All Comments
                    <span className="ml-2 text-xs font-mono text-muted-foreground">
                        {allComments.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("negative")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "negative"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Negative Only
                    <span className="ml-2 text-xs font-mono text-destructive">
                        {results.negativeComments.length}
                    </span>
                </button>
            </div>

            {/* ═══════════════════════════════════════════
          TAB: ALL COMMENTS (paginated, 50 per page)
          ═══════════════════════════════════════════ */}
            {activeTab === "all" && (
                <div className="space-y-4">
                    {/* Search */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label className="text-xs">Search comments</Label>
                                    <Input
                                        placeholder="Filter by text or username…"
                                        value={allCommentsSearch}
                                        onChange={(e) => handleAllSearch(e.target.value)}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground font-mono whitespace-nowrap pb-2">
                                    {filteredAll.length} comment{filteredAll.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Comment rows */}
                    <Card>
                        <CardContent className="p-0 divide-y divide-border">
                            {paginatedAll.length === 0 ? (
                                <div className="py-16 text-center">
                                    <p className="text-muted-foreground text-sm">No comments match your search</p>
                                </div>
                            ) : (
                                paginatedAll.map((comment, i) => {
                                    const globalIndex = (allCommentsPage - 1) * PAGE_SIZE + i + 1;
                                    // Check if this comment is negative
                                    const isNegative = results.negativeComments.some(
                                        (nc) => nc.id === comment.id || nc.text === comment.text
                                    );
                                    return (
                                        <div
                                            key={comment.id}
                                            className={`flex gap-4 px-5 py-4 hover:bg-muted/50 transition-colors ${isNegative ? "border-l-2 border-l-destructive" : ""
                                                }`}
                                        >
                                            {/* index number */}
                                            <span className="text-xs font-mono text-muted-foreground pt-0.5 w-8 shrink-0 text-right">
                                                {globalIndex}
                                            </span>
                                            {/* avatar */}
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground uppercase shrink-0">
                                                {comment.username.charAt(0)}
                                            </div>
                                            {/* content */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium truncate">@{comment.username}</span>
                                                    {isNegative && (
                                                        <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">
                                                            Negative
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-muted-foreground font-mono ml-auto shrink-0">
                                                        {comment.likes > 0 && `♥ ${comment.likes}`}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/90 leading-relaxed">{comment.text}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* Pagination controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground font-mono">
                                Page {allCommentsPage} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={allCommentsPage <= 1}
                                    onClick={() => setAllCommentsPage((p) => Math.max(1, p - 1))}
                                >
                                    ← Previous
                                </Button>

                                {/* Page numbers */}
                                <div className="hidden sm:flex gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter((p) => {
                                            // Show first, last, current, and neighbors
                                            return p === 1 || p === totalPages || Math.abs(p - allCommentsPage) <= 1;
                                        })
                                        .map((p, idx, arr) => (
                                            <span key={p} className="contents">
                                                {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                    <span className="px-1 text-xs text-muted-foreground self-center">…</span>
                                                )}
                                                <Button
                                                    variant={p === allCommentsPage ? "default" : "ghost"}
                                                    size="sm"
                                                    className="w-8 h-8 p-0 text-xs"
                                                    onClick={() => setAllCommentsPage(p)}
                                                >
                                                    {p}
                                                </Button>
                                            </span>
                                        ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={allCommentsPage >= totalPages}
                                    onClick={() => setAllCommentsPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    Next →
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════
          TAB: NEGATIVE COMMENTS (filtered)
          ═══════════════════════════════════════════ */}
            {activeTab === "negative" && (
                <div className="space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Search</Label>
                                    <Input
                                        placeholder="Filter by text or user…"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Category</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All categories</SelectItem>
                                            {allCategories.map((c) => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Severity</Label>
                                    <Select value={severity} onValueChange={setSeverity}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All severities" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All severities</SelectItem>
                                            <SelectItem value="mild">Mild</SelectItem>
                                            <SelectItem value="moderate">Moderate</SelectItem>
                                            <SelectItem value="severe">Severe</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground font-mono">
                                {filteredNegative.length} of {results.negativeComments.length} negative comments shown
                            </p>
                        </CardContent>
                    </Card>

                    {/* Comment cards */}
                    <div className="space-y-3 max-h-[640px] overflow-y-auto custom-scrollbar pr-1">
                        {filteredNegative.length === 0 ? (
                            <Card>
                                <CardContent className="py-16 text-center">
                                    <p className="text-muted-foreground text-sm">No negative comments found</p>
                                </CardContent>
                            </Card>
                        ) : (
                            filteredNegative.map((comment, i) => (
                                <Card
                                    key={comment.id}
                                    className="animate-enter-up overflow-hidden"
                                    style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s` }}
                                >
                                    <CardContent className="p-5">
                                        {/* top row */}
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="shrink-0 h-9 w-9 rounded-full bg-muted flex items-center justify-center font-semibold text-sm text-muted-foreground uppercase">
                                                    {comment.username.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">@{comment.username}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {new Date(comment.timestamp).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={SEV[comment.severity]?.badge ?? "secondary"} className="text-[10px] uppercase tracking-wider shrink-0">
                                                {comment.severity}
                                            </Badge>
                                        </div>

                                        {/* body */}
                                        <p className="text-sm leading-relaxed mb-3">{comment.text}</p>

                                        {/* tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {comment.categories.map((cat) => (
                                                <Badge key={cat} variant="outline" className="text-[10px] font-normal">
                                                    {cat}
                                                </Badge>
                                            ))}
                                        </div>

                                        <Separator className="my-3" />

                                        {/* footer */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground italic leading-relaxed max-w-[75%]">
                                                {comment.reason}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                </svg>
                                                {comment.likes}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── metric card ──────────────────────────────── */
function MetricCard({
    label,
    value,
    sub,
    accent,
}: {
    label: string;
    value: number;
    sub?: string;
    accent: string;
}) {
    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-2 font-medium">{label}</p>
                <p className={`text-3xl font-semibold tabular-nums text-${accent}`}>{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-1 font-mono">{sub}</p>}
            </CardContent>
        </Card>
    );
}
