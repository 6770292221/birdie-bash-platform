import mongoose, { Schema, Document } from 'mongoose';
import { IVenue } from '../types/venue';

export interface IVenueDocument extends Document {
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

const VenueSchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  rating: {
    type: Number
  },
  operatingHours: {
    monday: String,
    tuesday: String,
    wednesday: String,
    thursday: String,
    friday: String,
    saturday: String,
    sunday: String,
    daily: String
  },
  location: {
    lat: Number,
    lng: Number
  },
  facilities: [{
    type: String
  }],
  priceRange: {
    min: Number,
    max: Number,
    unit: {
      type: String,
      enum: ['hour', 'session']
    }
  }
}, {
  timestamps: true
});

export const Venue = mongoose.model<IVenueDocument>('Venue', VenueSchema);