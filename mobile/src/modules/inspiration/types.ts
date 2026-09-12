export type InspirationCategory =
  | 'all'
  | 'itinerary'
  | 'food'
  | 'hidden_gem'
  | 'practical_tip'
  | 'transport'
  | 'anecdote';

export type InspirationItemType = 'itinerary' | 'recommendation';

export interface InspirationCategoryOption {
  id: InspirationCategory;
  label: string;
  emoji: string;
}

export interface InspirationAuthor {
  id: string;
  name?: string;
  town_name?: string;
  region_name?: string;
  country_name?: string;
  avatar_url?: string;
  is_anonymous?: boolean;
}

export interface InspirationStage {
  id?: string;
  destination_name: string;
  town_name?: string;
  region_name?: string;
  country_name?: string;
  flag_emoji?: string;
  order_index?: number;
  arrival_date?: string;
  departure_date?: string;
}

export interface InspirationItem {
  id: string;
  type: InspirationItemType;
  title: string;
  description?: string;
  category?: InspirationCategory;
  image_url?: string;
  cover_image_url?: string;
  flag_emoji?: string;
  country_name?: string;
  country_code?: string;
  destination_id?: string;
  destination_name?: string;
  location_name?: string;
  total_days?: number;
  stages?: InspirationStage[];
  author: InspirationAuthor;
  useful_votes_count?: number;
  user_has_voted?: boolean;
  comments_count?: number;
  created_at?: string;
}

export interface InspirationResponse {
  items: InspirationItem[];
  total?: number;
  categories?: InspirationCategoryOption[];
}

export interface GetInspirationParams {
  q?: string;
  category?: string;
  country_code?: string;
  limit?: number;
  offset?: number;
}
