// Ruby — Research System Prompts
import { ResearchLevel, ResearchIntent, UserProfile, MemoryContext } from '../../shared/types';
import { getRubyPersonalityPrompt } from '../../services/personality/index';

export function buildResearchPrompt(
    level: ResearchLevel,
    intent: ResearchIntent,
    memory: MemoryContext,
    sourceText: string,
    query: string
): { systemPrompt: string; userPrompt: string } {
    const personality = getRubyPersonalityPrompt(memory.userProfile);

    const userPrefs = memory.userProfile ? `
## User Profile Context
- Preferred structure: ${memory.userProfile.output_preferences.preferred_structure}
- Preferred tone: ${memory.userProfile.output_preferences.preferred_tone}
- Recommendation style: ${memory.userProfile.output_preferences.recommendation_style}
- Reading style: ${memory.userProfile.output_preferences.reading_style}
- Dislikes: ${memory.userProfile.output_preferences.dislikes.join(', ')}
- Domain expertise: ${memory.userProfile.domain_expertise.primary.join(', ')}
` : '';

    const topicContext = memory.topicBrief ? `
## Topic Context
Chủ đề hiện tại đã được nghiên cứu trước đó:
- Mô tả: ${memory.topicBrief.description}
- Đã khám phá: ${memory.topicBrief.explored.join(', ')}
- Phát hiện chính: ${memory.topicBrief.keyFindings.join('; ')}
- Nhánh tiếp theo: ${memory.topicBrief.nextBranches.join(', ')}
` : '';

    const recentRunsContext = memory.recentRuns.length > 0 ? `
## Recent Research on This Topic
${memory.recentRuns.map(r => `- [LV${r.level}] ${r.summary} (${r.created_at})`).join('\n')}
` : '';

    const levelInstructions = getLevelInstructions(level);
    const intentInstructions = getIntentInstructions(intent);

    const systemPrompt = `${personality}

${userPrefs}

${levelInstructions}

${intentInstructions}

## Quy tắc chất lượng
- Output phải trả lời đúng câu hỏi
- Phân biệt rõ: (1) thông tin từ user, (2) thông tin công khai, (3) suy luận/khuyến nghị
- Không rambling, không generic, không lặp ý
- Recommendation phải actionable và có cơ sở
- Nếu evidence yếu, ghi rõ mức confidence
- Tự check trước khi trả lời:
  ✓ Đã trả lời đúng brief?
  ✓ Có section nào thiếu?
  ✓ Recommendation có quá speculative?
  ✓ Fact vs inference có rõ?

## Quy tắc định dạng cho Telegram (QUAN TRỌNG)
1. TUYỆT ĐỐI KHÔNG dùng bảng markdown (table). Telegram không hỗ trợ bảng. Hãy dùng danh sách liệt kê (bullet points) hoặc text thuần để so sánh.
2. Hạn chế tối đa việc in đậm (\`**\`). Chỉ in đậm tiêu đề mục hoặc những con số/từ khóa cực kỳ quan trọng. Không in đậm cả câu dài, không in đậm lặp đi lặp lại ở mọi bullet point, vì làm nát trải nghiệm đọc.
3. Dùng khoảng trắng (line break) hợp lý giữa các dòng để dễ đọc trên điện thoại.

## Quy tắc ưu tiên nguồn
1. Tài liệu user cung cấp → ưu tiên cao nhất
2. Nguồn công khai → bổ sung, so sánh, verify
3. Memory/context trước đó → kết nối liên tục

Nếu tài liệu user conflict với nguồn công khai → ưu tiên tài liệu user, ghi chú xung đột.
`;

    const userPrompt = `${topicContext}

${recentRunsContext}

## Yêu cầu nghiên cứu
${query}

## Tài liệu và nguồn đầu vào
${sourceText || 'Không có tài liệu bổ sung.'}

Hãy thực hiện nghiên cứu ở mức LV${level} và trả lời bằng tiếng Việt.`;

    return { systemPrompt, userPrompt };
}

function getLevelInstructions(level: ResearchLevel): string {
    switch (level) {
        case 1:
            return `## Output Level: LV1 — Tóm tắt nhanh
Format yêu cầu:
- Tiêu đề
- Tóm tắt ngắn (3-5 câu)
- 5-7 điểm chính (bullet points)
- Ghi chú nguồn ngắn
- Khuyến nghị ngắn

Giữ output dưới 800 từ. Ngắn gọn, súc tích, đi thẳng vào vấn đề.`;

        case 2:
            return `## Output Level: LV2 — Phân tích có cấu trúc (mặc định)
Format yêu cầu:
- Tiêu đề
- Executive Summary
- Bối cảnh / Tổng quan
- Phân tích chính
- Phát hiện quan trọng
- Cơ hội
- Rủi ro
- Khuyến nghị
- Ghi chú nguồn

Output có cấu trúc rõ, đủ sâu cho công việc thực tế. Dùng heading markdown.`;

        case 3:
            return `## Output Level: LV3 — Báo cáo chuyên sâu
Format yêu cầu:
- Tiêu đề
- Mục tiêu / Phạm vi
- Executive Summary
- Bối cảnh / Context
- Phân tích chính (nhiều section)
- Thị trường / Đối thủ / Ecosystem / Regulation (nếu liên quan)
- Phát hiện quan trọng
- Cơ hội
- Rủi ro
- Hàm ý chiến lược
- Khuyến nghị / Next Actions
- Phụ lục / Nguồn

Output sâu, toàn diện, phù hợp cho ra quyết định hoặc làm báo cáo. Luôn mở rộng phạm vi khi cần.`;

        default:
            return '';
    }
}

function getIntentInstructions(intent: ResearchIntent): string {
    const instructions: Partial<Record<ResearchIntent, string>> = {
        competitor: '## Intent: Phân tích đối thủ\nTập trung vào: positioning, strengths/weaknesses, market share, strategy, so sánh trực tiếp. Trình bày dạng bullet points, KHÔNG dùng bảng.',
        regulation: '## Intent: Nghiên cứu quy định\nTập trung vào: regulatory landscape, compliance requirements, recent changes, implications, risks.',
        company_profile: '## Intent: Hồ sơ công ty\nTập trung vào: overview, founding team, products, market position, funding, growth, strategy.',
        benchmarking: '## Intent: Benchmarking\nTập trung vào: metrics comparison, industry standards, positioning. Trình bày dạng bullet points, KHÔNG dùng bảng.',
        trend: '## Intent: Phân tích xu hướng\nTập trung vào: macro trends, drivers, timeline, implications, opportunities.',
        ecosystem_mapping: '## Intent: Mapping ecosystem\nTập trung vào: key players, relationships, value chain, gaps, opportunities.',
        due_diligence: '## Intent: Due diligence\nTập trung vào: risks, red flags, financials, team, market validation, competitive moat.',
        overview: '## Intent: Tổng quan\nCung cấp bird-eye view đầy đủ, có cấu trúc, dễ nắm bắt.',
    };

    return instructions[intent] || '';
}
