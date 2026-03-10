// Ruby — Model Orchestrator
import { Env, ModelTask, ModelTier } from '../../shared/types';
import { MODEL_ROUTING, MODEL_NAMES, GEMINI_API_BASE, TOKEN_BUDGETS } from '../../shared/config';
import { ModelError } from '../../shared/errors';

export interface ModelRequest {
    task: ModelTask;
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
}

export interface ModelResponse {
    text: string;
    model: string;
    tokenCount?: number;
}

export class ModelOrchestrator {
    constructor(private env: Env) { }

    async dispatch(request: ModelRequest): Promise<ModelResponse> {
        const tier = MODEL_ROUTING[request.task];
        const modelName = MODEL_NAMES[tier];

        const maxTokens = request.maxTokens || this.getDefaultMaxTokens(request.task);
        const temperature = request.temperature ?? this.getDefaultTemperature(request.task);

        const body: any = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: request.userPrompt }],
                },
            ],
            systemInstruction: {
                parts: [{ text: request.systemPrompt }],
            },
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: temperature,
            },
        };

        if (request.jsonMode) {
            body.generationConfig.responseMimeType = 'application/json';
        }

        const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${this.env.GEMINI_API_KEY}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout to prevent Cloudflare Worker silent kill

        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new ModelError(`Model API timed out after 25s. (Model: ${modelName})`);
            }
            throw new ModelError(`Failed to reach model API: ${error}`);
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Model API error (${modelName}):`, errorText);
            throw new ModelError(`Model API returned ${response.status}: ${errorText}`);
        }

        const data: any = await response.json();

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new ModelError('Model returned empty response');
        }

        const tokenCount = data.usageMetadata?.totalTokenCount;

        return {
            text,
            model: modelName,
            tokenCount,
        };
    }

    // Convenience: classify with fast model
    async classify(prompt: string, systemPrompt: string): Promise<string> {
        const response = await this.dispatch({
            task: 'classification',
            systemPrompt,
            userPrompt: prompt,
            maxTokens: 500,
            jsonMode: true,
        });
        return response.text;
    }

    // Convenience: synthesize research (always deep model)
    async synthesize(
        level: number,
        systemPrompt: string,
        userPrompt: string
    ): Promise<ModelResponse> {
        const task: ModelTask = level === 1 ? 'lv1_synthesis' :
            level === 3 ? 'lv3_synthesis' : 'lv2_synthesis';

        return this.dispatch({
            task,
            systemPrompt,
            userPrompt,
            maxTokens: TOKEN_BUDGETS[level] || TOKEN_BUDGETS[2],
            temperature: level === 3 ? 0.3 : 0.4,
        });
    }

    private getDefaultMaxTokens(task: ModelTask): number {
        const budgets: Partial<Record<ModelTask, number>> = {
            classification: 500,
            topic_matching: 500,
            memory_extraction: 1000,
            brief_update: 1500,
            profile_evolution: 1000,
            cta_selection: 200,
            quality_check: 1000,
            lv1_synthesis: TOKEN_BUDGETS[1],
            lv2_synthesis: TOKEN_BUDGETS[2],
            lv3_synthesis: TOKEN_BUDGETS[3],
            transformation: 6000,
            scheduled_research: TOKEN_BUDGETS[2],
        };
        return budgets[task] || 4000;
    }

    private getDefaultTemperature(task: ModelTask): number {
        const temps: Partial<Record<ModelTask, number>> = {
            classification: 0.1,
            topic_matching: 0.1,
            memory_extraction: 0.2,
            brief_update: 0.3,
            lv1_synthesis: 0.4,
            lv2_synthesis: 0.4,
            lv3_synthesis: 0.3,
            quality_check: 0.1,
        };
        return temps[task] || 0.3;
    }
}
