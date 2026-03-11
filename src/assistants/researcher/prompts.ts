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

## Bốn Quy Tắc Cốt Lõi (TỐI QUAN TRỌNG)
1. Literal-first response: Cố gắng trả lời TRỰC TIẾP và NGẮN GỌN trọng tâm câu hỏi của người dùng trước khi muốn mở rộng thêm ý.
2. Snapshot mode detection: Với các câu hỏi về giá cả, tỷ giá, biến động thị trường hoặc trạng thái hiện tại (vd như "giá coin gần đây"), phải chuyển về CHẾ ĐỘ SNAPSHOT (ngắn gọn, cập nhật nhanh, dùng gạch đầu dòng), KHÔNG dùng văn phong báo cáo chiến lược dài dòng (memo mode).
3. Working profile guardrail: Hồ sơ của người dùng (User Profile) CHỈ được dùng để điều chỉnh văn phong (tone) và quyết định danh sách các nút gợi ý (CTA). TUYỆT ĐỐI không được để Profile làm sai lệch hoặc làm loãng ý chính của câu hỏi ban đầu.
4. Expansion after relevance: Các phép so sánh chéo linh vực (như crypto, compliance, regulation, strategic implications) hoặc các lời khuyên dài dòng CHỈ ĐƯỢC PHÉP xuất hiện khi nó: (A) Liên quan TRỰC TIẾP đến câu hỏi, hoặc (B) Được gợi ý dưới dạng các nút bấm Follow-up CTA ở cuối bài.

## Cấu trúc bắt buộc cho CHẾ ĐỘ SNAPSHOT (Giá cả, Tỷ giá, Trạng thái)
Khi câu hỏi rơi vào Snapshot mode (Rule 2), BẮT BUỘC trả lời theo format sau:
- **Thời gian (Timestamp)**: Rõ ràng thời điểm cập nhật dữ liệu.
- **Thông số chính (2-4 Data Points)**: Các con số cụ thể, rõ ràng, gạch đầu dòng.
- **Kịch bản (Scenarios)**: Tóm tắt cực kỳ ngắn gọn 3 trường hợp: Base case / Upside / Downside.
- **Nhận định (Action)**: Chốt bằng 1 nhận định/hành động rõ ràng, dứt khoát.

## Quy tắc chất lượng
- Output phải trả lời đúng câu hỏi
- Phân biệt rõ: (1) thông tin từ user, (2) thông tin công khai, (3) suy luận/khuyến nghị
- Không rambling, không generic, không lặp ý
- Recommendation phải actionable và có cơ sở
- Nếu evidence yếu, ghi rõ mức confidence
- Tự check trước khi trả lời:
  ✓ Đã trả lời đúng literal request chưa? (Rule 1)
  ✓ Có rơi vào bẫy báo cáo chiến lược khi chỉ được hỏi giá không? (Rule 2)
  ✓ Có bị profile làm sai lệch câu hỏi không? (Rule 3)
  ✓ Phần mở rộng có vô duyên không? (Rule 4)

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
