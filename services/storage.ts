import { UserReport, EmergencyResource, Alert, DisasterType, NewsItem, Contact } from '../types';
import { MOCK_REPORTS, MOCK_RESOURCES, MOCK_ALERTS, MOCK_NEWS, MOCK_CONTACTS } from '../constants';

const KEYS = {
  REPORTS: 'disasterEye_reports',
  RESOURCES: 'disasterEye_resources',
  ALERTS: 'disasterEye_alerts',
  NEWS: 'disasterEye_news',
  CONTACTS: 'disasterEye_contacts'
};

const dateReviver = (key: string, value: any) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value);
  }
  return value;
};

// Simulate network latency for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  init: () => {
    if (!localStorage.getItem(KEYS.REPORTS)) {
      localStorage.setItem(KEYS.REPORTS, JSON.stringify(MOCK_REPORTS));
    }
    if (!localStorage.getItem(KEYS.RESOURCES)) {
      localStorage.setItem(KEYS.RESOURCES, JSON.stringify(MOCK_RESOURCES));
    }
    if (!localStorage.getItem(KEYS.ALERTS)) {
      localStorage.setItem(KEYS.ALERTS, JSON.stringify(MOCK_ALERTS));
    }
    if (!localStorage.getItem(KEYS.NEWS)) {
      localStorage.setItem(KEYS.NEWS, JSON.stringify(MOCK_NEWS));
    }
    if (!localStorage.getItem(KEYS.CONTACTS)) {
      localStorage.setItem(KEYS.CONTACTS, JSON.stringify(MOCK_CONTACTS));
    }
  },

  getReports: async (): Promise<UserReport[]> => {
    await delay(300); // Network simulation
    api.init();
    const raw = localStorage.getItem(KEYS.REPORTS);
    return raw ? JSON.parse(raw, dateReviver) : [];
  },

  createReport: async (report: Omit<UserReport, 'id' | 'timestamp' | 'verified'>): Promise<UserReport> => {
    await delay(600); // Simulate server processing
    const reports = await api.getReports();
    
    const newReport: UserReport = {
      ...report,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      verified: false // Manual user reports start as unverified
    };
    
    reports.push(newReport);
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
    
    // Broadcast update to all subscribers (Simulating WebSocket)
    window.dispatchEvent(new Event('db-reports-updated'));
    
    return newReport;
  },

  getResources: async (): Promise<EmergencyResource[]> => {
    await delay(200);
    api.init();
    const raw = localStorage.getItem(KEYS.RESOURCES);
    return raw ? JSON.parse(raw) : [];
  },
  
  getAlerts: async (): Promise<Alert[]> => {
    await delay(200);
    api.init();
    const raw = localStorage.getItem(KEYS.ALERTS);
    return raw ? JSON.parse(raw, dateReviver) : [];
  },

  getNews: async (): Promise<NewsItem[]> => {
    await delay(250);
    api.init();
    const raw = localStorage.getItem(KEYS.NEWS);
    return raw ? JSON.parse(raw, dateReviver) : [];
  },

  // Admin/System method to verify reports
  verifyReport: async (reportId: string): Promise<void> => {
      await delay(400);
      const reports = await api.getReports();
      const updatedReports = reports.map(r => r.id === reportId ? { ...r, verified: true } : r);
      localStorage.setItem(KEYS.REPORTS, JSON.stringify(updatedReports));
      window.dispatchEvent(new Event('db-reports-updated'));
  },

  getContacts: async (): Promise<Contact[]> => {
    await delay(200);
    api.init();
    const raw = localStorage.getItem(KEYS.CONTACTS);
    return raw ? JSON.parse(raw) : [];
  },

  addContact: async (contact: Omit<Contact, 'id'>): Promise<Contact> => {
    await delay(400);
    const contacts = await api.getContacts();
    const newContact = { ...contact, id: crypto.randomUUID() };
    contacts.push(newContact);
    localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
    return newContact;
  },

  deleteContact: async (id: string): Promise<void> => {
    await delay(300);
    const contacts = await api.getContacts();
    const filtered = contacts.filter(c => c.id !== id);
    localStorage.setItem(KEYS.CONTACTS, JSON.stringify(filtered));
  }
};