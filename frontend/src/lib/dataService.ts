import { supabase } from './supabaseClient';

export interface DbComplaint {
  id: string;
  citizen_id?: string;
  title: string;
  category: string;
  description: string;
  location: string;
  state: string;
  constituency: string;
  image_url?: string;
  status: string;
  priority: string;
  priority_score: number;
  officer_id?: string;
  created_at: string;
}

export interface DbAiAnalysis {
  id: string;
  complaint_id: string;
  summary: string;
  recommendation: string;
  estimated_budget: string;
  sentiment: string;
  department: string;
  created_at: string;
}

export interface DbWorkUpdate {
  id: string;
  complaint_id: string;
  officer_id?: string;
  remarks: string;
  before_image?: string;
  after_image?: string;
  completion_percentage: number;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id?: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

// Check if using placeholder credentials
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return url && !url.includes('placeholder-demo-project-id');
};

// Helper to initialize local storage databases
const getLocalStorageData = <T>(key: string, initialData: T[]): T[] => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initialData));
    return initialData;
  }
  return JSON.parse(data);
};

const setLocalStorageData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Mock Initial Databases
const initialComplaints: DbComplaint[] = [
  {
    id: "COMP-2026-781",
    citizen_id: "mock-user-citizen",
    title: "Pothole clusters near Main Crossroad",
    status: "Assigned",
    category: "Roads & Connectivity",
    location: "Ward 4, Mangalagiri",
    state: "Andhra Pradesh",
    constituency: "Guntur Lok Sabha",
    priority: "High",
    priority_score: 91,
    officer_id: "mock-user-officer",
    created_at: "2026-06-25T10:00:00Z"
  },
  {
    id: "COMP-2026-612",
    citizen_id: "mock-user-citizen",
    title: "Drainage overflow at Ward 4",
    status: "Resolved",
    category: "Water & Sanitation",
    location: "Campierganj Sector C",
    state: "Uttar Pradesh",
    constituency: "Gorakhpur Lok Sabha",
    priority: "Medium",
    priority_score: 65,
    officer_id: "mock-user-officer",
    created_at: "2026-05-14T10:00:00Z"
  }
];

const initialAiAnalysis: DbAiAnalysis[] = [
  {
    id: "ai-1",
    complaint_id: "COMP-2026-781",
    summary: "Large pothole clusters causing accidents near main crossroad.",
    recommendation: "Immediate road resurfacing and concrete leveling.",
    estimated_budget: "₹18 Lakhs",
    sentiment: "Negative",
    department: "Department of Public Works",
    created_at: "2026-06-25T10:05:00Z"
  }
];

const initialWorkUpdates: DbWorkUpdate[] = [
  {
    id: "upd-1",
    complaint_id: "COMP-2026-781",
    officer_id: "mock-user-officer",
    remarks: "Materials dispatched to site. Asphalt mixing in progress.",
    completion_percentage: 45,
    created_at: "2026-06-28T14:00:00Z"
  }
];

const initialNotifications: DbNotification[] = [
  { id: "not-1", user_id: "mock-user-citizen", text: "Your complaint regarding NH-29 Potholes has been assigned to Er. Ramesh Verma.", is_read: false, created_at: "2026-07-07T08:00:00Z" },
  { id: "not-2", user_id: "mock-user-citizen", text: "AI verification check completed: No duplicates found for your water pipeline request.", is_read: false, created_at: "2026-07-06T10:00:00Z" }
];

export const dataService = {
  // --- COMPLAINTS ---
  async getComplaints(filter?: { citizen_id?: string; officer_id?: string; constituency?: string }): Promise<DbComplaint[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('complaints').select('*');
        if (filter?.citizen_id) query = query.eq('citizen_id', filter.citizen_id);
        if (filter?.officer_id) query = query.eq('officer_id', filter.officer_id);
        if (filter?.constituency) query = query.eq('constituency', filter.constituency);
        const { data, error } = await query;
        if (!error && data) return data as DbComplaint[];
      } catch (err) {
        console.warn("Supabase query failed, falling back to local database:", err);
      }
    }
    
    // LocalStorage Fallback
    let list = getLocalStorageData<DbComplaint>('db_complaints', initialComplaints);
    if (filter?.citizen_id) list = list.filter(c => c.citizen_id === filter.citizen_id);
    if (filter?.officer_id) list = list.filter(c => c.officer_id === filter.officer_id);
    if (filter?.constituency) list = list.filter(c => c.constituency === filter.constituency);
    return list;
  },

  async insertComplaint(complaint: Omit<DbComplaint, 'id' | 'created_at'>): Promise<DbComplaint> {
    const newId = `COMP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newRecord: DbComplaint = {
      ...complaint,
      id: newId,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('complaints').insert(newRecord).select().single();
        if (!error && data) return data as DbComplaint;
      } catch (err) {
        console.warn("Supabase insert failed, falling back to local database:", err);
      }
    }

    const list = getLocalStorageData<DbComplaint>('db_complaints', initialComplaints);
    list.unshift(newRecord);
    setLocalStorageData('db_complaints', list);
    return newRecord;
  },

  async updateComplaint(id: string, updates: Partial<DbComplaint>): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('complaints').update(updates).eq('id', id);
        if (!error) return;
      } catch (err) {
        console.warn("Supabase update failed, falling back to local database:", err);
      }
    }

    const list = getLocalStorageData<DbComplaint>('db_complaints', initialComplaints);
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      setLocalStorageData('db_complaints', list);
    }
  },

  // --- AI ANALYSIS ---
  async getAiAnalysis(complaintId: string): Promise<DbAiAnalysis | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('ai_analysis').select('*').eq('complaint_id', complaintId).single();
        if (!error && data) return data as DbAiAnalysis;
      } catch (err) {
        console.warn("Supabase query failed, falling back to local database:", err);
      }
    }

    const list = getLocalStorageData<DbAiAnalysis>('db_ai_analysis', initialAiAnalysis);
    return list.find(a => a.complaint_id === complaintId) || null;
  },

  async insertAiAnalysis(analysis: Omit<DbAiAnalysis, 'id' | 'created_at'>): Promise<DbAiAnalysis> {
    const newRecord: DbAiAnalysis = {
      ...analysis,
      id: `ai-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('ai_analysis').insert(newRecord).select().single();
        if (!error && data) return data as DbAiAnalysis;
      } catch (err) {
        console.warn("Supabase insert failed, falling back to local database:", err);
      }
    }

    const list = getLocalStorageData<DbAiAnalysis>('db_ai_analysis', initialAiAnalysis);
    list.push(newRecord);
    setLocalStorageData('db_ai_analysis', list);
    return newRecord;
  },

  // --- WORK UPDATES ---
  async getWorkUpdates(complaintId: string): Promise<DbWorkUpdate[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('work_updates').select('*').eq('complaint_id', complaintId);
        if (!error && data) return data as DbWorkUpdate[];
      } catch (err) {
        console.warn("Supabase query failed, falling back to local database:", err);
      }
    }

    const list = getLocalStorageData<DbWorkUpdate>('db_work_updates', initialWorkUpdates);
    return list.filter(u => u.complaint_id === complaintId);
  },

  async insertWorkUpdate(update: Omit<DbWorkUpdate, 'id' | 'created_at'>): Promise<DbWorkUpdate> {
    const newRecord: DbWorkUpdate = {
      ...update,
      id: `upd-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('work_updates').insert(newRecord).select().single();
        if (!error && data) return data as DbWorkUpdate;
      } catch (err) {
        console.warn("Supabase insert failed, falling back to local database:", err);
      }
    }

    const list = getLocalStorageData<DbWorkUpdate>('db_work_updates', initialWorkUpdates);
    list.unshift(newRecord);
    setLocalStorageData('db_work_updates', list);
    return newRecord;
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string): Promise<DbNotification[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId);
        if (!error && data) return data as DbNotification[];
      } catch (err) {
        console.warn("Supabase query failed, falling back to local database:", err);
      }
    }

    return getLocalStorageData<DbNotification>('db_notifications', initialNotifications).filter(n => n.user_id === userId);
  },

  async insertNotification(userId: string, text: string): Promise<void> {
    const newRecord: DbNotification = {
      id: `not-${Date.now()}`,
      user_id: userId,
      text,
      is_read: false,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').insert(newRecord);
        return;
      } catch (err) {
        console.warn("Supabase insert failed, falling back to local database:", err);
      }
    }

    const list = getLocalStorageData<DbNotification>('db_notifications', initialNotifications);
    list.unshift(newRecord);
    setLocalStorageData('db_notifications', list);
  }
};
