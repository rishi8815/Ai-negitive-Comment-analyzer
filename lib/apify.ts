/**
 * Instagram Comment Scraper — Direct GraphQL API approach
 *
 * This module scrapes comments by calling Instagram's internal GraphQL
 * endpoints directly with session cookies, giving us full pagination
 * support to fetch ALL comments (not just the initial ~15).
 *
 * FLOW:
 *  1. Fetch the post page to extract the media ID (shortcode → media_id)
 *  2. Paginate through comments via Instagram's GraphQL API
 *  3. Return all comments in a normalized format
 *
 * Requires: INSTAGRAM_SESSION_ID cookie in .env.local
 *           (or falls back to Apify actor for unauthenticated scraping)
 */

import { ApifyClient } from 'apify-client';

export interface InstagramComment {
    id: string;
    text: string;
    ownerUsername: string;
    ownerProfilePicUrl?: string;
    timestamp: string;
    likesCount: number;
}

export interface ApifyScraperOutput {
    comments: InstagramComment[];
    postUrl: string;
    postId: string;
    totalComments: number;
}

// ─── MAIN ENTRY POINT ──────────────────────────────────────
export async function scrapeInstagramComments(
    postUrl: string,
    limit: number = 100
): Promise<ApifyScraperOutput> {

    const sessionId = process.env.INSTAGRAM_SESSION_ID;

    if (sessionId) {
        console.log('[Scraper] Using direct Instagram GraphQL API (authenticated)');
        return scrapeViaGraphQL(postUrl, limit, sessionId);
    }

    // Fallback: Apify (limited, unauthenticated)
    console.log('[Scraper] No INSTAGRAM_SESSION_ID found, falling back to Apify actor (limited)');
    return scrapeViaApify(postUrl, limit);
}

// ─── GRAPHQL APPROACH (AUTHENTICATED, FULL PAGINATION) ─────
async function scrapeViaGraphQL(
    postUrl: string,
    limit: number,
    sessionId: string
): Promise<ApifyScraperOutput> {

    const shortcode = extractShortcode(postUrl);
    if (!shortcode) {
        throw new Error('Could not extract shortcode from URL: ' + postUrl);
    }
    console.log(`[GraphQL] Shortcode: ${shortcode}`);

    // Step 1: Get the media_id from the shortcode
    const mediaId = await getMediaId(shortcode, sessionId);
    console.log(`[GraphQL] Media ID: ${mediaId}`);

    // Step 2: Paginate through comments
    const comments: InstagramComment[] = [];
    let endCursor: string | null = null;
    let hasNextPage = true;
    let pageNum = 0;

    while (hasNextPage && comments.length < limit) {
        pageNum++;
        const batchSize = Math.min(50, limit - comments.length); // Instagram max per request is ~50

        console.log(`[GraphQL] Fetching page ${pageNum} (cursor: ${endCursor ? '...' + endCursor.slice(-10) : 'start'})...`);

        const result = await fetchCommentsPage(mediaId, batchSize, endCursor, sessionId);

        for (const edge of result.edges) {
            if (comments.length >= limit) break;

            const node = edge.node;
            comments.push({
                id: node.id || node.pk || String(comments.length),
                text: node.text || '',
                ownerUsername: node.owner?.username || node.user?.username || 'unknown',
                ownerProfilePicUrl: node.owner?.profile_pic_url || node.user?.profile_pic_url || undefined,
                timestamp: node.created_at
                    ? new Date(node.created_at * 1000).toISOString()
                    : new Date().toISOString(),
                likesCount: node.comment_like_count || node.edge_liked_by?.count || 0,
            });
        }

        hasNextPage = result.hasNextPage;
        endCursor = result.endCursor;

        console.log(`[GraphQL] Page ${pageNum}: got ${result.edges.length} comments (total: ${comments.length})`);

        // Rate-limit: small delay between pages
        if (hasNextPage && comments.length < limit) {
            await sleep(800 + Math.random() * 500);
        }
    }

    console.log(`[GraphQL] Done! Scraped ${comments.length} comments total.`);

    return {
        comments,
        postUrl,
        postId: shortcode,
        totalComments: comments.length,
    };
}

// ─── Get media_id from shortcode ────────────────────────────
async function getMediaId(shortcode: string, sessionId: string): Promise<string> {
    // Try the oembed approach first (no auth needed)
    try {
        const oembedUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
        const res = await fetch(oembedUrl, {
            headers: buildHeaders(sessionId),
        });

        if (res.ok) {
            const data = await res.json();
            const mediaId = data?.graphql?.shortcode_media?.id
                || data?.items?.[0]?.pk
                || data?.items?.[0]?.id;
            if (mediaId) return String(mediaId);
        }
    } catch (e) {
        console.log('[GraphQL] __a=1 approach failed, trying info endpoint...');
    }

    // Try the /api/v1/media endpoint
    try {
        const infoUrl = `https://www.instagram.com/api/v1/media/${shortcode}/info/`;
        const res = await fetch(infoUrl, {
            headers: buildHeaders(sessionId),
        });

        if (res.ok) {
            const data = await res.json();
            const mediaId = data?.items?.[0]?.pk || data?.items?.[0]?.id;
            if (mediaId) return String(mediaId);
        }
    } catch (e) {
        console.log('[GraphQL] info endpoint failed, trying web_info...');
    }

    // Try the web info endpoint
    try {
        const webInfoUrl = `https://www.instagram.com/api/v1/media/${shortcode}/web_info/`;
        const res = await fetch(webInfoUrl, {
            headers: buildHeaders(sessionId),
        });

        if (res.ok) {
            const data = await res.json();
            const mediaId = data?.items?.[0]?.pk || data?.items?.[0]?.id;
            if (mediaId) return String(mediaId);
        }
    } catch (e) {
        console.log('[GraphQL] web_info failed too');
    }

    // Last resort: decode shortcode to numeric ID
    // Instagram shortcodes are base64-encoded media IDs
    const numericId = shortcodeToMediaId(shortcode);
    if (numericId) {
        console.log(`[GraphQL] Decoded shortcode to numeric ID: ${numericId}`);
        return numericId;
    }

    throw new Error('Could not resolve media ID for shortcode: ' + shortcode);
}

// ─── Fetch one page of comments ─────────────────────────────
interface CommentsPage {
    edges: any[];
    hasNextPage: boolean;
    endCursor: string | null;
}

async function fetchCommentsPage(
    mediaId: string,
    count: number,
    after: string | null,
    sessionId: string
): Promise<CommentsPage> {
    // Try the v1 API endpoint first (most reliable with sessionid)
    try {
        let url = `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false&count=${count}`;
        if (after) {
            url += `&min_id=${after}`;
        }

        const res = await fetch(url, {
            headers: buildHeaders(sessionId),
        });

        if (res.ok) {
            const data = await res.json();
            const comments = data.comments || [];
            return {
                edges: comments.map((c: any) => ({ node: c })),
                hasNextPage: !!data.has_more_comments || !!data.next_min_id,
                endCursor: data.next_min_id || null,
            };
        }

        console.log(`[GraphQL] v1 comments endpoint returned ${res.status}, trying GraphQL...`);
    } catch (e) {
        console.log('[GraphQL] v1 comments endpoint failed, trying GraphQL...');
    }

    // Fallback: GraphQL query
    const queryHash = '97b41c52301f77ce508f55e66d17620e'; // comments query hash
    const variables = JSON.stringify({
        shortcode: mediaId, // Some queries use shortcode, some use media_id
        first: count,
        after: after || '',
    });

    const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(variables)}`;

    const res = await fetch(graphqlUrl, {
        headers: buildHeaders(sessionId),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error(`[GraphQL] Query failed (${res.status}):`, text.slice(0, 200));
        throw new Error(`Instagram API returned ${res.status}. Your session cookie may be expired.`);
    }

    const data = await res.json();
    const edgeMedia = data?.data?.shortcode_media?.edge_media_to_parent_comment
        || data?.data?.shortcode_media?.edge_media_to_comment;

    if (!edgeMedia) {
        console.error('[GraphQL] Unexpected response structure:', JSON.stringify(data).slice(0, 300));
        return { edges: [], hasNextPage: false, endCursor: null };
    }

    return {
        edges: edgeMedia.edges || [],
        hasNextPage: edgeMedia.page_info?.has_next_page || false,
        endCursor: edgeMedia.page_info?.end_cursor || null,
    };
}

// ─── HTTP Headers ───────────────────────────────────────────
function buildHeaders(sessionId: string): Record<string, string> {
    return {
        'Cookie': `sessionid=${sessionId}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Referer': 'https://www.instagram.com/',
    };
}

// ─── APIFY FALLBACK (unauthenticated, limited) ─────────────
async function scrapeViaApify(
    postUrl: string,
    limit: number
): Promise<ApifyScraperOutput> {
    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
        throw new Error('Neither INSTAGRAM_SESSION_ID nor APIFY_API_KEY is configured.');
    }

    const client = new ApifyClient({ token: apiKey });

    const input = {
        directUrls: [postUrl],
        resultsLimit: limit,
    };

    console.log('[Apify] Starting actor run...');
    const run = await client.actor("SbK00X0JYCPblD2wp").call(input);
    console.log(`[Apify] Actor run completed: ${run.status}`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`[Apify] Retrieved ${items.length} items from dataset`);

    if (items.length === 0) {
        throw new Error(
            'No comments found. Without INSTAGRAM_SESSION_ID, only ~15 comments are accessible. ' +
            'Add your Instagram session cookie to .env.local for full access.'
        );
    }

    const comments: InstagramComment[] = [];
    const seenIds = new Set<string>();

    for (const item of items as any[]) {
        const c = toComment(item);
        if (c && !seenIds.has(c.id)) {
            seenIds.add(c.id);
            comments.push(c);
        }
        if (Array.isArray((item as any).replies)) {
            for (const reply of (item as any).replies) {
                const r = toComment(reply);
                if (r && !seenIds.has(r.id)) {
                    seenIds.add(r.id);
                    comments.push(r);
                }
            }
        }
    }

    const shortcode = extractShortcode(postUrl) || 'unknown';

    return {
        comments,
        postUrl,
        postId: shortcode,
        totalComments: comments.length,
    };
}

// ─── UTILITIES ──────────────────────────────────────────────
function toComment(raw: any): InstagramComment | null {
    if (!raw || typeof raw !== 'object') return null;
    const text = raw.text ?? raw.comment_text ?? raw.body ?? raw.content ?? '';
    const id = String(raw.id ?? raw.pk ?? raw.comment_id ?? Math.random().toString(36).slice(2, 11));
    const username = raw.ownerUsername ?? raw.owner?.username ?? raw.user?.username ?? raw.username ?? 'unknown';

    return {
        id,
        text: String(text).trim() || '(empty)',
        ownerUsername: String(username),
        ownerProfilePicUrl: raw.ownerProfilePicUrl ?? raw.owner?.profile_pic_url ?? raw.profile_pic_url ?? undefined,
        timestamp: raw.timestamp ?? raw.created_at
            ? (typeof raw.created_at === 'number'
                ? new Date(raw.created_at * 1000).toISOString()
                : raw.created_at)
            : new Date().toISOString(),
        likesCount: Number(raw.likesCount ?? raw.comment_like_count ?? raw.like_count ?? 0),
    };
}

function extractShortcode(url: string): string | null {
    const match = url.match(/\/(p|reel|tv)\/([\w-]+)/);
    return match ? match[2] : null;
}

/**
 * Decode an Instagram shortcode to a numeric media ID.
 * Instagram uses a modified base64 alphabet for shortcodes.
 */
function shortcodeToMediaId(shortcode: string): string | null {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let id = BigInt(0);
    for (const char of shortcode) {
        const idx = alphabet.indexOf(char);
        if (idx === -1) return null;
        id = id * BigInt(64) + BigInt(idx);
    }
    return id.toString();
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
