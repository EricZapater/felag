export type PhotoSharingMode = 'all_felagis' | 'close_origin' | 'none';

export interface ActiveTripHubResponse {
  has_active_trip: boolean;
  trip_id?: string;
  trip_title?: string;
  destination_name?: string;
  country_code?: string;
  country_flag?: string;
  current_day?: number;
  total_days?: number;
  is_final_day_or_past?: boolean;
  photo_sharing_mode?: PhotoSharingMode;
  photos_count?: number;
  celebration_cards_count?: number;
  active_felagis_count?: number;
}

export interface TripPhoto {
  id: string;
  trip_id: string;
  user_id?: string;
  image_url: string;
  caption?: string;
  is_featured: boolean;
  location_name?: string;
  created_at: string;
}

export interface AddTripPhotoRequest {
  image_url: string;
  caption?: string;
  is_featured?: boolean;
  location_name?: string;
}

export interface UserOriginSummary {
  id: string;
  name: string;
  avatar_url?: string;
  town_name?: string;
  region_name?: string;
  country_name?: string;
}

export interface CelebrationCard {
  id: string;
  trip_id: string;
  user_1: UserOriginSummary;
  user_2: UserOriginSummary;
  image_url: string;
  title: string;
  headline: string;
  subheadline?: string;
  location_name: string;
  created_at: string;
}

export interface CreateCelebrationCardRequest {
  user_2_id: string;
  image_url: string;
  location_name: string;
  caption?: string;
}

export interface WrapupStatus {
  is_final_day_or_past: boolean;
  celebration_completed: boolean;
  feedback_completed: boolean;
  stories_ready: boolean;
  progress_percentage?: number;
}

export type CommunityTipCategory = 'food' | 'hidden_gem' | 'transport' | 'practical_tip' | 'anecdote';

export interface CommunityTip {
  category: CommunityTipCategory;
  title: string;
  description: string;
  image_url?: string;
}

export interface TripFeedbackRequest {
  rating: number;
  comments?: string;
  community_tips?: CommunityTip[];
}

export interface StoriesCardData {
  trip_id: string;
  trip_title: string;
  destination_name?: string;
  country_flag?: string;
  author_name: string;
  author_origin?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  stages_count: number;
  felagis_met_count: number;
  featured_photos: string[];
}

export interface SuccessResponse {
  success: boolean;
  message?: string;
}
