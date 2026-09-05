export type TripVisibility = 'public' | 'contacts_only' | 'private';

export type TripStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

export type TripFilter = 'all' | 'upcoming' | 'past';

export type CompanionRole = 'owner' | 'companion';

export type CompanionStatus = 'accepted' | 'pending';

export interface TripCompanion {
  id: string;
  trip_id: string;
  user_id: string;
  name: string;
  avatar_url?: string | null;
  origin_summary?: string | null;
  town_name?: string | null;
  role: CompanionRole;
  status: CompanionStatus;
  created_at: string;
}

export interface FelagiUserSummary {
  id: string;
  name: string;
  avatar_url?: string | null;
  origin_summary?: string | null;
  town_name?: string | null;
}

export interface AddCompanionRequest {
  user_id: string;
}

export interface TripStage {
  id: string;
  trip_id: string;
  stage_order: number;
  destination_name: string;
  town_id?: string | null;
  region_id?: string | null;
  country_code?: string | null;
  start_date: string;
  end_date: string;
  notes?: string | null;
}

export interface TripStageInput {
  stage_order: number;
  destination_name: string;
  town_id?: string | null;
  region_id?: string | null;
  country_code?: string | null;
  start_date: string;
  end_date: string;
  notes?: string | null;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  visibility: TripVisibility;
  status: TripStatus;
  photo_sharing_mode?: string;
  is_owner?: boolean;
  companions?: TripCompanion[];
  stages: TripStage[];
  created_at: string;
  updated_at: string;
}

export interface CreateTripRequest {
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  visibility: TripVisibility;
  photo_sharing_mode?: string;
  companion_user_ids?: string[];
  stages: TripStageInput[];
}

export interface UpdateTripRequest {
  title?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  visibility?: TripVisibility;
  photo_sharing_mode?: string;
  companion_user_ids?: string[];
  stages?: TripStageInput[];
}

export interface ErrorResponse {
  code: string;
  message: string;
}
