/**
 * Serializable social feed and night-event schemas reserved for Phases 5 & 6.
 * Kept empty in Phase 1 while ensuring compact JSON state compatibility.
 */

export interface SocialPost {
  id: string;
  authorId: string;
  captionKey: string;
  timestampDay: number;
  likes: number;
}

export interface NightEventLog {
  day: number;
  eventType: 'quiet' | 'solo' | 'crew' | 'dual' | 'special';
}
