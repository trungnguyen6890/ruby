// Ruby — CTA Selection Logic
import { CTAOption, ResearchLevel, ResearchIntent } from '../shared/types';

export const CTA_POOL: Record<string, CTAOption> = {
    expand_lv2: { text: '📊 Mở rộng LV2', callbackData: 'expand_lv2' },
    deep_lv3: { text: '🔬 Đào sâu LV3', callbackData: 'deep_lv3' },
    continue_topic: { text: '➡️ Tiếp tục topic', callbackData: 'continue_topic' },
    make_shorter: { text: '📝 Tóm tắt ngắn', callbackData: 'make_shorter' },
    export_pdf: { text: '📄 Xuất PDF', callbackData: 'export_pdf' },
    compare_competitor: { text: '⚔️ So sánh đối thủ', callbackData: 'compare_competitor' },
    benchmark: { text: '📈 Benchmark thị trường', callbackData: 'benchmark' },
    next_actions: { text: '✅ Liệt kê next actions', callbackData: 'next_actions' },
    slide_outline: { text: '📑 Outline slide', callbackData: 'slide_outline' },
};

export function selectCTAs(level: ResearchLevel, intent: ResearchIntent): CTAOption[] {
    const ctas: CTAOption[] = [];

    if (intent === 'greeting') {
        return ctas;
    }

    if (level === 1) {
        ctas.push(CTA_POOL.expand_lv2);
        ctas.push(CTA_POOL.deep_lv3);
        ctas.push(CTA_POOL.continue_topic);
        return ctas;
    }

    if (level === 2) {
        ctas.push(CTA_POOL.deep_lv3);
        ctas.push(CTA_POOL.make_shorter);

        // Smart route based on intent instead of hardcoded 'compare_competitor'
        switch (intent) {
            case 'company_profile':
                ctas.push(CTA_POOL.compare_competitor);
                break;
            case 'competitor':
            case 'benchmarking':
                ctas.push(CTA_POOL.benchmark);
                break;
            case 'regulation':
            case 'trend':
                ctas.push(CTA_POOL.next_actions);
                break;
            case 'due_diligence':
            case 'ecosystem_mapping':
            case 'overview':
            default:
                ctas.push(CTA_POOL.slide_outline);
                break;
        }

        ctas.push(CTA_POOL.export_pdf);
        return ctas;
    }

    if (level === 3) {
        ctas.push(CTA_POOL.export_pdf);
        ctas.push(CTA_POOL.slide_outline);
        ctas.push(CTA_POOL.next_actions);
        return ctas;
    }

    return ctas;
}
