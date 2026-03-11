// Ruby — Webhook Handler
import { Env, TelegramUpdate, TelegramMessage, TelegramCallbackQuery } from '../shared/types';
import { TelegramAPI } from './telegram';
import { selectCTAs, CTA_POOL } from './cta';
import { researchPipeline } from '../assistants/researcher/pipeline';
import { handleCommand } from './commands';
import { classifyRequest } from '../assistants/researcher/classifier';
import { ModelOrchestrator } from '../services/model/orchestrator';
import { ALLOWED_USERS } from '../shared/config';

export async function handleWebhook(update: TelegramUpdate, env: Env): Promise<void> {
    const telegram = new TelegramAPI(env);

    try {
        // Authorization check
        const fromUser = update.message?.from || update.callback_query?.from;
        const username = fromUser?.username || '';

        if (!ALLOWED_USERS.includes(username)) {
            const chatId = update.message?.chat.id || update.callback_query?.message?.chat.id;
            if (chatId) {
                console.log(`Unauthorized access attempt from username: ${username}, id: ${fromUser?.id}`);
                await telegram.sendMessage(
                    chatId,
                    '❌ Xin lỗi, Ruby đang trong giai đoạn private beta và chỉ phục vụ danh sách thành viên nội bộ. Bạn vui lòng liên hệ Anh Trung nhé!'
                );
            }
            return;
        }

        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query, telegram, env);
            return;
        }

        if (update.message) {
            await handleMessage(update.message, telegram, env);
            return;
        }
    } catch (error) {
        console.error('Webhook handler error:', error);
        const chatId = update.message?.chat.id || update.callback_query?.message?.chat.id;
        if (chatId) {
            await telegram.sendMessage(chatId, '❌ Xin lỗi Anh Trung, Ruby gặp lỗi khi xử lý. Anh thử lại nhé!');
        }
    }
}

async function handleMessage(message: TelegramMessage, telegram: TelegramAPI, env: Env): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text || message.caption || '';

    // Handle commands
    if (text.startsWith('/')) {
        await handleCommand(text, chatId, telegram, env);
        return;
    }

    // Collect input materials
    const inputs: { type: string; content?: string; fileId?: string; mimeType?: string }[] = [];

    if (text) {
        inputs.push({ type: 'text', content: text });
    }

    if (message.document) {
        inputs.push({
            type: getDocumentType(message.document.mime_type),
            fileId: message.document.file_id,
            mimeType: message.document.mime_type,
            content: message.document.file_name || 'document',
        });
    }

    if (message.photo && message.photo.length > 0) {
        // Get highest resolution photo
        const photo = message.photo[message.photo.length - 1];
        inputs.push({
            type: 'image',
            fileId: photo.file_id,
        });
    }

    // Pre-classify to detect intent before sending loading message
    const queryText = text || 'General research request';
    const model = new ModelOrchestrator(env);
    const classification = await classifyRequest(queryText, model);

    await telegram.sendChatAction(chatId, 'typing');

    // Only send the "nghiên cứu" message if it's actually a research request
    if (classification.intent !== 'greeting') {
        await telegram.sendMessage(chatId, '🔍 Ruby đang nghiên cứu cho Anh Trung...');
    }

    // Run research pipeline
    if (classification.intent === 'greeting') {
        const result = await researchPipeline(inputs, env, chatId, classification);
        const ctas = selectCTAs(result.level, result.intent);
        const keyboard = ctas.map((cta: any) => [{ text: cta.text, callback_data: cta.callbackData }]);

        await telegram.sendMessage(chatId, result.fullOutput, {
            parseMode: 'Markdown',
            replyMarkup: { inline_keyboard: keyboard },
        });
    } else {
        await env.RESEARCH_QUEUE.send({
            type: 'research',
            chatId,
            inputs,
            classification
        });
    }
}

async function handleCallbackQuery(
    query: TelegramCallbackQuery,
    telegram: TelegramAPI,
    env: Env
): Promise<void> {
    await telegram.answerCallbackQuery(query.id);

    const chatId = query.message?.chat.id;
    if (!chatId || !query.data) return;

    const action = query.data;
    const btnText = CTA_POOL[action]?.text || action;

    // Treat CTA callbacks as new research requests with context
    const ctaPrompts: Record<string, string> = {
        'expand_lv2': 'Mở rộng kết quả vừa rồi lên LV2',
        'deep_lv3': 'Đào sâu kết quả vừa rồi lên LV3',
        'continue_topic': 'Tiếp tục chủ đề này',
        'make_shorter': 'Tóm tắt ngắn gọn hơn kết quả vừa rồi',
        'export_pdf': 'Xuất kết quả vừa rồi thành PDF',
        'compare_competitor': 'So sánh với đối thủ trong lĩnh vực này',
        'benchmark': 'Benchmark với thị trường',
        'next_actions': 'Liệt kê các next actions',
        'slide_outline': 'Chuẩn bị outline cho slide',
    };

    const actionPrompt = ctaPrompts[action] || action;
    const previousMessageText = query.message?.text || query.message?.caption || '';

    // Inject the actual text from the message the button was attached to 
    // This allows offline operations like "summarize" without needing to fetch from DB
    const finalPrompt = previousMessageText
        ? `${actionPrompt}\n\nDưới đây là nội dung cần xử lý:\n\n"""\n${previousMessageText}\n"""`
        : actionPrompt;

    await telegram.answerCallbackQuery(query.id, `Đang xử lý: ${btnText}...`);
    await telegram.sendChatAction(chatId, 'typing');
    await telegram.sendMessage(chatId, `⚡️ Đã nhận yêu cầu: **${btnText}**\n\n🔍 Ruby đang xử lý...`, { parseMode: 'Markdown' });

    const inputs = [{ type: 'text', content: finalPrompt }];

    await env.RESEARCH_QUEUE.send({
        type: 'research',
        chatId,
        inputs
    });
}

function getDocumentType(mimeType?: string): string {
    if (!mimeType) return 'document';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('docx')) return 'docx';
    if (mimeType.startsWith('image/')) return 'image';
    return 'document';
}
