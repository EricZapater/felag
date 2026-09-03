export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface Region {
  id: string;
  name: string;
  country_id: string;
}

export interface Town {
  id: string;
  name: string;
  region_id: string;
}

export interface OriginHierarchy {
  country: Country;
  region: Region;
  town: Town;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  origin?: OriginHierarchy | null;
}

export interface UpdateProfileRequest {
  name?: string;
  phone_number?: string;
  bio?: string;
}
