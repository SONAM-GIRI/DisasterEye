import { DisasterType, EmergencyResource, RiskLevel, UserReport, Alert, NewsItem, Contact } from './types';

export const MOCK_RESOURCES: EmergencyResource[] = [
  {
    id: '1',
    name: 'Central City Hospital',
    type: 'HOSPITAL',
    location: { lat: 34.0522, lng: -118.2437 },
    status: 'AVAILABLE'
  },
  {
    id: '2',
    name: 'Westside Shelter (HS Gym)',
    type: 'SHELTER',
    location: { lat: 34.0622, lng: -118.2537 },
    status: 'AVAILABLE'
  },
  {
    id: '3',
    name: 'Downtown Police Precinct',
    type: 'POLICE',
    location: { lat: 34.0422, lng: -118.2337 },
    status: 'AVAILABLE'
  }
];

export const MOCK_REPORTS: UserReport[] = [
  {
    id: 'r1',
    type: DisasterType.FLOOD,
    description: 'Water rising rapidly near the river bank.',
    timestamp: new Date(),
    coordinates: { lat: 34.055, lng: -118.245 },
    verified: true
  },
  {
    id: 'r2',
    type: DisasterType.FIRE,
    description: 'Smoke spotted on the northern ridge.',
    timestamp: new Date(Date.now() - 3600000),
    coordinates: { lat: 34.075, lng: -118.265 },
    verified: false
  }
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'a1',
    message: 'FLASH FLOOD WARNING: Sector 4 levee integrity compromised. Evacuate to high ground immediately.',
    level: RiskLevel.CRITICAL,
    timestamp: new Date()
  },
  {
    id: 'a2',
    message: 'Wildfire containment dropped to 40%. Smoke advisory in effect for downtown.',
    level: RiskLevel.HIGH,
    timestamp: new Date(Date.now() - 1000 * 60 * 30)
  }
];

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'Global Climate Summit Addresses Rising Sea Levels',
    summary: 'World leaders gather to discuss emergency protocols for coastal cities facing immediate flood risks.',
    source: 'Global News Network',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    imageUrl: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=600&auto=format&fit=crop',
    url: '#'
  },
  {
    id: 'n2',
    title: 'Tech Giants Unveil New Seismic Sensors',
    summary: 'A new array of AI-powered sensors promises to increase earthquake warning times by up to 30 seconds.',
    source: 'Tech Daily',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
    url: '#'
  },
  {
    id: 'n3',
    title: 'Hurricane Season 2025 Predictions Released',
    summary: 'Meteorologists predict a higher-than-average number of named storms this year due to ocean warming.',
    source: 'Weather Watch',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    imageUrl: 'https://images.unsplash.com/photo-1569060368523-c9e54d6d67cf?q=80&w=600&auto=format&fit=crop',
    url: '#'
  }
];

export const MOCK_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Sarah Connor', relation: 'Mother', phone: '+1 (555) 019-2834', email: 'sarah@example.com' },
  { id: 'c2', name: 'Kyle Reese', relation: 'Partner', phone: '+1 (555) 123-4567', email: 'kyle@example.com' }
];

export const MAP_CENTER = { lat: 34.0522, lng: -118.2437 }; // Los Angeles
export const ZOOM_LEVEL = 13;