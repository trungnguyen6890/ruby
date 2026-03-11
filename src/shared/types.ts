// Ruby — Shared TypeScript Types

// ========== Environment ==========
export interface Env {
    DB: D1Database;
    R2: R2Bucket;
    RESEARCH_QUEUE: Queue<any>;
    TELEGRAM_BOT_TOKEN: string;
    GEMINI_API_KEY: string;
}

// ========== Telegram ==========
export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    document?: TelegramDocument;
    photo?: TelegramPhotoSize[];
    caption?: string;
}

export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
}

export interface TelegramChat {
    id: number;
    type: string;
}

export interface TelegramDocument {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

export interface TelegramPhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
}

export interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
}

export interface InlineKeyboardButton {
    text: string;
    callback_data: string;
}

// ========== Research ==========
export type ResearchLevel = 1 | 2 | 3;

export type ResearchIntent =
    | 'greeting'
    | 'overview'
    | 'competitor'
    | 'due_diligence'
    | 'regulation'
    | 'benchmarking'
    | 'company_profile'
    | 'trend'
    | 'ecosystem_mapping'
    | 'general';

export interface ClassificationResult {
    level: ResearchLevel;
    intent: ResearchIntent;
    language: string;
    isCommand: boolean;
    commandType?: string;
    topicHint?: string;
}

export interface SourceBundle {
    sources: SourceItem[];
    combinedText: string;
}

export interface SourceItem {
    type: 'user_text' | 'user_link' | 'user_pdf' | 'user_docx' | 'user_image' | 'web_search';
    origin: string;
    content: string;
    priority: number;
}

export interface ResearchOutput {
    title: string;
    level: ResearchLevel;
    intent: ResearchIntent;
    summary: string;
    fullOutput: string;
    topicId: string;
    modelUsed: string;
    tokenCount?: number;
    durationMs?: number;
}

// ========== Topics ==========
export interface Topic {
    id: string;
    title: string;
    brief: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface TopicBrief {
    description: string;
    explored: string[];
    keyFindings: string[];
    nextBranches: string[];
}

// ========== Memory ==========
export interface UserProfile {
    identity: {
        name: string;
        role: string;
        timezone: string;
        language: string;
    };
    domain_expertise: {
        primary: string[];
        secondary: string[];
        active: string[];
        domain_depth_map: Record<string, string>;
    };
    output_preferences: {
        default_level: string;
        preferred_structure: string;
        preferred_tone: string;
        preferred_depth_by_topic: Record<string, string>;
        recommendation_style: string;
        reading_style: string;
        format_preferences: string[];
        dislikes: string[];
    };
    reasoning_preferences: {
        values_critical_thinking: boolean;
        wants_contrarian_views: boolean;
        expects_fact_vs_inference: boolean;
        prefers_grounded_speculation: boolean;
        decision_framework: string;
    };
    interaction_patterns: {
        typical_query_style: string;
        follow_up_frequency: string;
        prefers_proactive_suggestions: boolean;
        feedback_signals: string[];
        conversation_style: string;
    };
    active_projects: string[];
    recurring_entities: string[];
    historical_context: {
        topics_explored: string[];
        notable_decisions: string[];
        ongoing_threads: string[];
    };
    meta: {
        profile_version: number;
        total_interactions: number;
        last_significant_update: string | null;
        confidence_score: number;
    };
}

export interface MemoryContext {
    userProfile: UserProfile;
    topicBrief: TopicBrief | null;
    recentRuns: { summary: string; level: number; created_at: string }[];
    recentConversations: { message_text: string; ruby_response: string }[];
}

// ========== Model ==========
export type ModelTier = 'fast' | 'deep';

export type ModelTask =
    | 'classification'
    | 'topic_matching'
    | 'memory_extraction'
    | 'brief_update'
    | 'profile_evolution'
    | 'cta_selection'
    | 'web_content_extraction'
    | 'lv1_synthesis'
    | 'lv2_synthesis'
    | 'lv3_synthesis'
    | 'transformation'
    | 'image_analysis'
    | 'quality_check'
    | 'scheduled_research';

// ========== Scheduler ==========
export type ScheduleType = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface ScheduledJob {
    id: string;
    topic_query: string;
    topic_id: string | null;
    schedule_type: ScheduleType;
    schedule_day: string | null;
    schedule_time: string;
    timezone: string;
    level: ResearchLevel;
    status: string;
    last_run_at: string | null;
    next_run_at: string | null;
}

// ========== CTA ==========
export interface CTAOption {
    text: string;
    callbackData: string;
}
