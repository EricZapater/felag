export type AffinityLevel = 'town' | 'region' | 'country';

export interface FelagiUser {
  id: string;
  name: string;
  avatar_url?: string | null;
  origin_summary?: string;
}

export interface Match {
  id: string;
  trip_id: string;
  matched_trip_id?: string;
  matched_user: FelagiUser;
  destination_name: string;
  overlap_start_date: string;
  overlap_end_date: string;
  affinity_level: AffinityLevel;
  affinity_score: number;
  explanation: string;
  created_at: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
}
