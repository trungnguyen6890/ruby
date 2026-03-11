// Ruby — Default User Profile
import { UserProfile } from '../../shared/types';

export function getDefaultUserProfile(): UserProfile {
    return {
        identity: {
            name: 'Anh Trung',
            role: 'Founder / CEO',
            timezone: 'Asia/Ho_Chi_Minh',
            language: 'vi',
        },
        domain_expertise: {
            primary: ['blockchain', 'crypto', 'compliance', 'regulation'],
            secondary: ['market_analysis', 'competitor_research', 'fundraising'],
            active: ['growth', 'marketing', 'product_strategy', 'partnership', 'BD'],
            domain_depth_map: {
                blockchain: 'expert',
                compliance: 'expert',
                market: 'advanced',
                fundraising: 'advanced',
                growth: 'intermediate',
                product_strategy: 'advanced',
            },
        },
        output_preferences: {
            default_level: 'LV2',
            preferred_structure: 'executive_summary_first',
            preferred_tone: 'strategic_and_practical',
            preferred_depth_by_topic: {
                strategy: 'LV3',
                compliance: 'LV3',
                quick_check: 'LV1',
            },
            recommendation_style: 'actionable_with_next_steps',
            reading_style: 'conclusion_first_then_detail',
            format_preferences: ['bullet_lists', 'bullet_key_points', 'risk_highlight'],
            dislikes: [
                'generic_answers',
                'rambling',
                'academic_tone',
                'excessive_caveats',
                'empty_recommendations',
                'citation_clutter',
            ],
        },
        reasoning_preferences: {
            values_critical_thinking: true,
            wants_contrarian_views: true,
            expects_fact_vs_inference: true,
            prefers_grounded_speculation: true,
            decision_framework: 'data_driven_with_strategic_intuition',
        },
        interaction_patterns: {
            typical_query_style: 'broad_then_drill_down',
            follow_up_frequency: 'high',
            prefers_proactive_suggestions: true,
            feedback_signals: [],
            conversation_style: 'direct_and_efficient',
        },
        active_projects: [],
        recurring_entities: [],
        historical_context: {
            topics_explored: [],
            notable_decisions: [],
            ongoing_threads: [],
        },
        meta: {
            profile_version: 1,
            total_interactions: 0,
            last_significant_update: null,
            confidence_score: 0.0,
        },
    };
}
