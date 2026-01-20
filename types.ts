export enum DisasterType {
  FLOOD = 'FLOOD',
  FIRE = 'FIRE',
  EARTHQUAKE = 'EARTHQUAKE',
  LANDSLIDE = 'LANDSLIDE',
  STORM = 'STORM',
  NONE = 'NONE'
}

export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface EmergencyResource {
  id: string;
  name: string;
  type: 'HOSPITAL' | 'SHELTER' | 'POLICE' | 'SUPPLY';
  location: Coordinates;
  status: 'AVAILABLE' | 'FULL' | 'CLOSED';
}

export interface PredictionResult {
  disasterType: DisasterType;
  confidence: number;
  riskLevel: RiskLevel;
  summary: string;
  immediateActions: string[];
  estimatedImpact: {
    radiusKm: number;
    peopleAffected: number;
    infrastructureDamage: string;
  };
}

export interface Alert {
  id: string;
  message: string;
  level: RiskLevel;
  timestamp: Date;
}

export interface UserReport {
  id: string;
  type: DisasterType;
  description: string;
  timestamp: Date;
  coordinates: Coordinates;
  verified: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: Date;
  imageUrl?: string;
  url?: string;
}

export interface Contact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  email: string;
}