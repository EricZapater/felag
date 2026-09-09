export interface PublicDestinationItem {
  id: string;
  slug: string;
  name: string;
  region_name?: string;
  country_name: string;
  country_code: string;
  flag_emoji?: string;
  cover_image_url?: string;
  total_felagis_count: number;
  total_tips_count: number;
  endorsement_summary: string;
  updated_at_period: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface PublicDestinationsResponse {
  data: PublicDestinationItem[];
  pagination: PaginationMeta;
}

export interface PublicAnonymousTip {
  id: string;
  title: string;
  description: string;
  category: 'food' | 'hidden_gem' | 'transport' | 'practical_tip' | 'anecdote';
  location_hint?: string;
  photo_url?: string;
  endorsements_count: number;
  endorsement_label: string;
  period: string;
}

export interface PublicFaqItem {
  question: string;
  answer: string;
  endorsement_label: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SeoMetadata {
  meta_title: string;
  meta_description: string;
  keywords: string[];
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  robots: string;
  breadcrumbs: BreadcrumbItem[];
  json_ld: Record<string, any>;
}

export interface DestinationStats {
  total_felagis: number;
  total_tips: number;
  hidden_gems_count: number;
  food_spots_count: number;
  practical_tips_count: number;
}

export interface CategorizedTips {
  food: PublicAnonymousTip[];
  hidden_gem: PublicAnonymousTip[];
  transport: PublicAnonymousTip[];
  practical_tip: PublicAnonymousTip[];
  anecdote: PublicAnonymousTip[];
}

export interface PublicDestinationGuide {
  destination: PublicDestinationItem;
  stats: DestinationStats;
  categories: CategorizedTips;
  faqs: PublicFaqItem[];
  related_destinations: PublicDestinationItem[];
  seo: SeoMetadata;
}
