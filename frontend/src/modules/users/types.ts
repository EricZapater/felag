export interface PublicTripSummary {
  id: string;
  title: string;
  destination_summary?: string;
  start_date: string;
  end_date: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  avatar_url?: string | null;
  bio?: string | null;
  origin_summary?: string;
  public_trips?: PublicTripSummary[];
}
