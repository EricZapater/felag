export type TripVisibility = 'public' | 'contacts_only' | 'private';
export type TripStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';
export type TripFilter = 'all' | 'upcoming' | 'past';

export interface TripStage {
  id: string;
  trip_id: string;
  stage_order: number;
  destination_name: string;
  country_code?: string | null;
  start_date: string;
  end_date: string;
  notes?: string | null;
}

export interface TripStageInput {
  stage_order: number;
  destination_name: string;
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
  stages: TripStageInput[];
}

export interface UpdateTripRequest {
  title?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  visibility?: TripVisibility;
  stages?: TripStageInput[];
}

export interface ErrorResponse {
  code: string;
  message: string;
}
