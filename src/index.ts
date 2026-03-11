// Ruby — Cloudflare Worker Entry Point
import { Env, TelegramUpdate } from './shared/types';
import { handleWebhook } from './gateway/webhook';
import { TelegramAPI } from './gateway/telegram';
import { handleScheduledResearch } from './services/scheduler/index';

import { researchPipeline } from './assistants/researcher/pipeline';
import { selectCTAs } from './gateway/cta';

export default {
    // HTTP handler — Telegram webhooks + setup endpoints
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // ... (existing code for fetch)
        const url = new URL(request.url);

        // Health check
        if (url.pathname === '/' || url.pathname === '/health') {
            return new Response(JSON.stringify({ status: 'ok', bot: 'Ruby Assistant', version: '1.0.0' }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Set webhook endpoint
        if (url.pathname === '/set-webhook') {
            const telegram = new TelegramAPI(env);
            const webhookUrl = `${url.origin}/webhook`;
            await telegram.setWebhook(webhookUrl);
            return new Response(JSON.stringify({ ok: true, webhook_url: webhookUrl }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Telegram webhook
        if (url.pathname === '/webhook' && request.method === 'POST') {
            try {
                const update: TelegramUpdate = await request.json();

                // Process in background to return 200 quickly
                ctx.waitUntil(handleWebhook(update, env));

                return new Response('OK', { status: 200 });
            } catch (error) {
                console.error('Webhook parse error:', error);
                return new Response('Bad Request', { status: 400 });
            }
        }

        return new Response('Not Found', { status: 404 });
    },

    // Queue consumer — long running background tasks
    async queue(batch: any, env: Env, ctx: ExecutionContext): Promise<void> {
        const telegram = new TelegramAPI(env);
        for (const msg of batch.messages) {
            const task = msg.body;
            if (task.type === 'research') {
                const notifyInterval = setInterval(() => {
                    telegram.sendMessage(task.chatId, '⏳ Ruby vẫn đang đào sâu tổng hợp thông tin, Anh Trung đợi thêm xíu nha...').catch(console.error);
                }, 25000);

                try {
                    const result = await researchPipeline(task.inputs, env, task.chatId, task.classification);
                    const ctas = selectCTAs(result.level, result.intent);
                    const keyboard = ctas.map((cta: any) => [{ text: cta.text, callback_data: cta.callbackData }]);

                    await telegram.sendMessage(task.chatId, result.fullOutput, {
                        parseMode: 'Markdown',
                        replyMarkup: { inline_keyboard: keyboard },
                    });
                } catch (error: any) {
                    console.error('Queue processing error:', error);
                    if (error.name === 'ModelError' || (error.message && error.message.includes('timed out'))) {
                        await telegram.sendMessage(task.chatId, '⏱️ Xin lỗi Anh Trung, hệ thống AI trả lời quá lâu (vượt mức cho phép). Anh thử chia nhỏ câu hỏi ra hoặc hỏi lại giúp Ruby nhé! 🙇‍♀️');
                    } else {
                        await telegram.sendMessage(task.chatId, '❌ Xin lỗi Anh Trung, Ruby gặp lỗi khi xử lý dữ liệu. Anh thử lại sau nhé!');
                    }
                } finally {
                    clearInterval(notifyInterval);
                }
            }
        }
    },

    // Cron handler — scheduled research
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil(handleScheduledResearch(env));
    },
};
