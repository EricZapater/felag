export type DestinationType = 'town' | 'country';

export type PhotoSharingMode = 'all_felagis' | 'close_origin' | 'none';

export type RecommendationCategory =
  | 'food'
  | 'hidden_gem'
  | 'transport'
  | 'practical_tip'
  | 'anecdote';

export type RecommendationCategoryFilter = 'all' | RecommendationCategory;

export type OriginFilter = 'all' | 'same_origin' | 'same_town';

export type SortOrder = 'useful' | 'recent';

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
  category: RecommendationCategory;
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
  category: RecommendationCategory;
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

export interface UpdatePhotoSharingRequest {
  photo_sharing_mode: PhotoSharingMode;
}

export type CommunityReportTargetType = 'recommendation' | 'comment' | 'live_moment';

export type CommunityReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'false_information'
  | 'harassment'
  | 'other';

export interface CommunityReportRequest {
  target_type: CommunityReportTargetType;
  target_id: string;
  reason: CommunityReportReason;
  details?: string;
}

export interface SuccessResponse {
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  error: string;
}

export interface TownSearchResult {
  id: string;
  name: string;
  region_id?: string;
  region_name?: string;
  country_id?: string;
  country_name?: string;
  country_code?: string;
}
