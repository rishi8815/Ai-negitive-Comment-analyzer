import { NextRequest, NextResponse } from 'next/server';
import { scrapeInstagramComments } from '@/lib/apify';
import { analyzeCommentsWithGemini, NegativeComment } from '@/lib/gemini';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

interface AnalyzeRequest {
    postUrl: string;
    commentLimit?: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeRequest = await request.json();
        const { postUrl, commentLimit = 100 } = body;

        // Validate input
        if (!postUrl) {
            return NextResponse.json(
                { error: 'Instagram post URL is required' },
                { status: 400 }
            );
        }

        // Validate Instagram URL format
        const instagramUrlPattern = /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel)\/[\w-]+/i;
        if (!instagramUrlPattern.test(postUrl)) {
            return NextResponse.json(
                { error: 'Invalid Instagram post or reel URL' },
                { status: 400 }
            );
        }

        console.log(`[API] Starting analysis for: ${postUrl}`);

        // Step 1: Scrape comments using Apify
        console.log('[API] Step 1: Scraping comments...');
        const scrapedData = await scrapeInstagramComments(postUrl, commentLimit);

        if (scrapedData.comments.length === 0) {
            return NextResponse.json(
                { error: 'No comments found for this post' },
                { status: 404 }
            );
        }

        console.log(`[API] Scraped ${scrapedData.totalComments} comments`);

        // Step 2: Analyze comments with Gemini AI
        console.log('[API] Step 2: Analyzing sentiment with Gemini AI...');
        const analysisResult = await analyzeCommentsWithGemini(scrapedData.comments);

        console.log(`[API] Found ${analysisResult.negativeCount} negative comments`);

        // Step 3: Save results to JSON file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = join(process.cwd(), 'output');
        const outputFilePath = join(outputDir, `negative-comments-${timestamp}.json`);

        // Create output directory if it doesn't exist
        try {
            await mkdir(outputDir, { recursive: true });
        } catch (error) {
            // Directory might already exist, ignore error
        }

        // Prepare output data
        const outputData = {
            metadata: {
                postUrl,
                postId: scrapedData.postId,
                analysisTimestamp: analysisResult.analysisTimestamp,
                totalCommentsScraped: scrapedData.totalComments,
                negativeCommentsFound: analysisResult.negativeCount,
                positiveCommentsFound: analysisResult.positiveCount,
                neutralCommentsFound: analysisResult.neutralCount,
            },
            statistics: {
                totalComments: analysisResult.totalComments,
                negativePercentage: (
                    (analysisResult.negativeCount / analysisResult.totalComments) * 100
                ).toFixed(2) + '%',
                positivePercentage: (
                    (analysisResult.positiveCount / analysisResult.totalComments) * 100
                ).toFixed(2) + '%',
                neutralPercentage: (
                    (analysisResult.neutralCount / analysisResult.totalComments) * 100
                ).toFixed(2) + '%',
            },
            severityBreakdown: {
                mild: analysisResult.negativeComments.filter(c => c.severity === 'mild').length,
                moderate: analysisResult.negativeComments.filter(c => c.severity === 'moderate').length,
                severe: analysisResult.negativeComments.filter(c => c.severity === 'severe').length,
            },
            negativeComments: analysisResult.negativeComments.map((comment: NegativeComment) => ({
                id: comment.id,
                username: comment.ownerUsername,
                text: comment.text,
                timestamp: comment.timestamp,
                likes: comment.likesCount,
                sentiment: comment.sentiment,
                reason: comment.reason,
                severity: comment.severity,
                categories: comment.categories,
            })),
            allComments: scrapedData.comments.map((comment) => ({
                id: comment.id,
                username: comment.ownerUsername,
                text: comment.text,
                timestamp: comment.timestamp,
                likes: comment.likesCount,
            })),
        };

        // Save to file
        await writeFile(
            outputFilePath,
            JSON.stringify(outputData, null, 2),
            'utf-8'
        );

        console.log(`[API] Results saved to: ${outputFilePath}`);

        // Return response
        return NextResponse.json({
            success: true,
            message: 'Analysis completed successfully',
            data: outputData,
            outputFile: outputFilePath,
        });

    } catch (error: any) {
        console.error('[API] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to analyze comments',
                details: error.message,
            },
            { status: 500 }
        );
    }
}
