export type DestinationType = 'town' | 'country';

export interface DestinationSummary {
  id: string;
  name: string;
  region_name?: string;
  country_name?: string;
  country_code?: string;
  type: DestinationType;
  recommendations_count?: number;
  active_felagis_count?: number;
}

export type PhotoSharingMode = 'all_felagis' | 'close_origin' | 'none';

export interface DestinationDetail {
  id: string;
  name: string;
  region_name?: string;
  country_name?: string;
  country_code: string;
  flag_emoji?: string;
  total_recommendations?: number;
  active_felagis_count?: number;
  total_visitors_count?: number;
  user_is_travelling_now?: boolean;
  user_photo_sharing_mode?: PhotoSharingMode;
}

export type RecommendationCategory =
  | 'all'
  | 'food'
  | 'hidden_gem'
  | 'transport'
  | 'practical_tip'
  | 'anecdote';

export type OriginFilter = 'all' | 'same_origin' | 'same_town';

export type SortBy = 'useful' | 'recent';

export interface AuthorSummary {
  id: string;
  name: string;
  avatar_url?: string;
  town_name?: string;
  region_name?: string;
  country_name?: string;
}

export interface Recommendation {
  id: string;
  destination_id?: string;
  category: Exclude<RecommendationCategory, 'all'>;
  title: string;
  description: string;
  image_url?: string;
  location_name?: string;
  useful_votes_count: number;
  user_has_voted?: boolean;
  comments_count?: number;
  author: AuthorSummary;
  created_at: string;
}

export interface CreateRecommendationRequest {
  category: Exclude<RecommendationCategory, 'all'>;
  title: string;
  description: string;
  image_url?: string;
  location_name?: string;
}

export interface VoteResponse {
  voted: boolean;
  useful_votes_count: number;
}

export interface Comment {
  id: string;
  content: string;
  author: AuthorSummary;
  created_at: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface LiveMoment {
  id: string;
  image_url: string;
  caption?: string;
  author: AuthorSummary;
  created_at: string;
}

export interface LiveFeedResponse {
  active_felagis_count: number;
  moments: LiveMoment[];
}

export interface CreateLiveMomentRequest {
  image_url: string;
  caption?: string;
}

export interface UpdatePhotoSharingModeRequest {
  photo_sharing_mode: PhotoSharingMode;
}

export type ReportTargetType = 'recommendation' | 'comment' | 'live_moment';

export type ReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'false_information'
  | 'harassment'
  | 'other';

export interface CommunityReportRequest {
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details?: string;
}

export interface SuccessResponse {
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  error: string;
}
