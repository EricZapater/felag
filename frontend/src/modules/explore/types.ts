export interface ExploreDestinationItem {
  id: string;
  name: string;
  region_name?: string;
  country_name: string;
  country_code: string;
  flag_emoji?: string;
  banner_url?: string;
  total_recommendations?: number;
  active_felagis_count?: number;
  affinity_reason?: string;
}
