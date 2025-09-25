export interface IVenue {
  id: string;
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  operatingHours: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
    daily?: string; // For venues open same hours every day
  };
  location?: {
    lat?: number;
    lng?: number;
  };
  facilities?: string[];
  priceRange?: {
    min?: number;
    max?: number;
    unit?: 'hour' | 'session';
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVenueCreate {
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  operatingHours: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
    daily?: string;
  };
  location?: {
    lat?: number;
    lng?: number;
  };
  facilities?: string[];
  priceRange?: {
    min?: number;
    max?: number;
    unit?: 'hour' | 'session';
  };
}