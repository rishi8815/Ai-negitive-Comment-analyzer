/**
 * Gemini AI Integration for Negative Comment Detection
 * This module uses Google's Gemini API to analyze comment sentiment
 */

import { InstagramComment } from './apify';

export interface NegativeComment extends InstagramComment {
    sentiment: 'negative';
    reason: string;
    severity: 'mild' | 'moderate' | 'severe';
    categories: string[];
}

export interface SentimentAnalysisResult {
    totalComments: number;
    negativeComments: NegativeComment[];
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    analysisTimestamp: string;
}

/**
 * Analyzes a batch of comments using Gemini AI
 * @param comments - Array of Instagram comments to analyze
 * @returns Promise with sentiment analysis results
 */
export async function analyzeCommentsWithGemini(
    comments: InstagramComment[]
): Promise<SentimentAnalysisResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    const negativeComments: NegativeComment[] = [];
    let positiveCount = 0;
    let neutralCount = 0;

    // Process comments in batches to avoid rate limits
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < comments.length; i += batchSize) {
        batches.push(comments.slice(i, i + batchSize));
    }

    console.log(`Analyzing ${comments.length} comments in ${batches.length} batches...`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1}/${batches.length}...`);

        try {
            const results = await analyzeBatch(batch, apiKey);

            results.forEach((result, index) => {
                if (result.isNegative) {
                    negativeComments.push({
                        ...batch[index],
                        sentiment: 'negative',
                        reason: result.reason,
                        severity: result.severity,
                        categories: result.categories,
                    });
                } else if (result.isPositive) {
                    positiveCount++;
                } else {
                    neutralCount++;
                }
            });

            // Add delay between batches to respect rate limits
            if (batchIndex < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error(`Error processing batch ${batchIndex + 1}:`, error);
            // Continue with next batch even if one fails
        }
    }

    return {
        totalComments: comments.length,
        negativeComments,
        positiveCount,
        neutralCount,
        negativeCount: negativeComments.length,
        analysisTimestamp: new Date().toISOString(),
    };
}

/**
 * Analyzes a batch of comments using Gemini API
 */
async function analyzeBatch(
    comments: InstagramComment[],
    apiKey: string
): Promise<Array<{
    isNegative: boolean;
    isPositive: boolean;
    reason: string;
    severity: 'mild' | 'moderate' | 'severe';
    categories: string[];
}>> {
    const prompt = `You are an expert sentiment analyzer for social media comments. Analyze the following Instagram comments and determine if they are negative, positive, or neutral.

For each comment, identify:
1. Sentiment: negative, positive, or neutral
2. If negative, provide a brief reason
3. If negative, rate severity: mild, moderate, or severe
4. If negative, categorize into types: hate speech, harassment, spam, offensive language, trolling, cyberbullying, etc.

Comments to analyze:
${comments.map((c, i) => `${i + 1}. "${c.text}" (by @${c.ownerUsername})`).join('\n')}

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "commentIndex": 1,
    "sentiment": "negative" | "positive" | "neutral",
    "reason": "brief explanation if negative",
    "severity": "mild" | "moderate" | "severe" (only if negative),
    "categories": ["category1", "category2"] (only if negative)
  }
]

Important: Return ONLY the JSON array, no additional text or explanation.`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text;

    // Extract JSON from the response (handle markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
        const analysis = JSON.parse(jsonText);

        return comments.map((_, index) => {
            const result = analysis.find((a: any) => a.commentIndex === index + 1) || {
                sentiment: 'neutral',
                reason: '',
                severity: 'mild',
                categories: [],
            };

            return {
                isNegative: result.sentiment === 'negative',
                isPositive: result.sentiment === 'positive',
                reason: result.reason || '',
                severity: result.severity || 'mild',
                categories: result.categories || [],
            };
        });
    } catch (parseError) {
        console.error('Failed to parse Gemini response:', responseText);
        throw new Error('Failed to parse Gemini API response');
    }
}

/**
 * Analyzes a single comment using Gemini AI (for testing purposes)
 */
export async function analyzeSingleComment(
    comment: InstagramComment
): Promise<NegativeComment | null> {
    const result = await analyzeCommentsWithGemini([comment]);
    return result.negativeComments.length > 0 ? result.negativeComments[0] : null;
}
