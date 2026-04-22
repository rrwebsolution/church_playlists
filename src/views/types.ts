// types.ts
export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  file_path?: string | null; // Importante ni
  lyrics?: string;
  chords?: string;
  offset?: number;
  isGenerating?: boolean;
}

export interface PlaylistFolder {
  id: string;
  name: string;
  songs: Song[];
}

export interface ServicePlanItem {
  id: string;
  title: string;
  type:
    | 'song'
    | 'prayer'
    | 'welcome'
    | 'offering'
    | 'announcement'
    | 'sermon'
    | 'communion'
    | 'special'
    | 'closing';
  leader?: string;
  durationMinutes?: number;
  notes?: string;
  completed?: boolean;
}

export interface ServicePlan {
  id: string;
  title: string;
  serviceDate: string;
  theme?: string;
  notes?: string;
  items: ServicePlanItem[];
  updatedAt: string;
}

export interface SermonOutlinePoint {
  id: string;
  heading: string;
  details?: string;
}

export interface SermonVerse {
  id: string;
  reference: string;
  text?: string;
}

export interface SermonNote {
  id: string;
  title: string;
  serviceDate: string;
  speaker?: string;
  series?: string;
  mainText?: string;
  keyIdea?: string;
  openingPrayer?: string;
  closingPrayer?: string;
  altarCall?: string;
  notes?: string;
  outline: SermonOutlinePoint[];
  verses: SermonVerse[];
  actionSteps: string[];
  updatedAt: string;
}

export interface VolunteerAssignment {
  id: string;
  ministry:
    | 'worship'
    | 'media'
    | 'ushering'
    | 'speaker'
    | 'prayer'
    | 'kids'
    | 'security'
    | 'hospitality'
    | 'other';
  role: string;
  volunteerName: string;
  contact?: string;
  arrivalTime?: string;
  status?: 'confirmed' | 'pending' | 'substitute' | 'absent';
  notes?: string;
}

export interface VolunteerSchedule {
  id: string;
  title: string;
  serviceDate: string;
  serviceTime?: string;
  venue?: string;
  notes?: string;
  assignments: VolunteerAssignment[];
  updatedAt: string;
}

export interface AttendanceEntry {
  id: string;
  fullName: string;
  category: 'member' | 'visitor' | 'youth' | 'kids' | 'volunteer' | 'staff';
  status: 'present' | 'late' | 'absent' | 'first-time';
  contact?: string;
  ministry?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  title: string;
  serviceDate: string;
  serviceType?: 'sunday-service' | 'prayer-meeting' | 'youth-service' | 'cell-group' | 'special-event';
  venue?: string;
  notes?: string;
  entries: AttendanceEntry[];
  updatedAt: string;
}

export interface OfferingEntry {
  id: string;
  date?: string;
  category: 'tithe' | 'offering' | 'missions' | 'building-fund' | 'special-love-gift' | 'other';
  amount: number;
  paymentMethod?: 'cash' | 'gcash' | 'bank-transfer' | 'check' | 'other';
  donorName?: string;
  receivedBy?: string;
  notes?: string;
}

export interface OfferingExpense {
  id: string;
  category?: 'utilities' | 'food' | 'transport' | 'honorarium' | 'supplies' | 'missions' | 'maintenance' | 'other';
  description: string;
  amount: number;
  paidTo?: string;
  notes?: string;
}

export interface OfferingRecord {
  id: string;
  title: string;
  isTitleEdited?: boolean;
  serviceDate: string;
  serviceType?: 'sunday-service' | 'prayer-meeting' | 'youth-service' | 'special-event';
  countedBy?: string;
  witnessBy?: string;
  treasuryNotes?: string;
  entries: OfferingEntry[];
  expenses?: OfferingExpense[];
  isSaved?: boolean;
  updatedAt: string;
}

export interface MemberProfile {
  id: string;
  fullName: string;
  gender?: 'male' | 'female';
  birthday?: string;
  phone?: string;
  email?: string;
  address?: string;
  ministry?: string;
  memberStatus?: 'member' | 'visitor' | 'leader' | 'volunteer' | 'inactive';
  civilStatus?: 'single' | 'married' | 'widowed' | 'other';
  emergencyContact?: string;
  notes?: string;
  updatedAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  audience?: 'church-wide' | 'youth' | 'kids' | 'leaders' | 'volunteers' | 'visitors' | 'other';
  category?: 'event' | 'reminder' | 'birthday' | 'service-update' | 'ministry' | 'special';
  priority?: 'low' | 'normal' | 'high' | 'featured';
  isPublished?: boolean;
  shortText?: string;
  body?: string;
  contactPerson?: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  eventDate: string;
  endDate?: string;
  eventTime?: string;
  venue?: string;
  ministry?: string;
  eventType?: 'service' | 'rehearsal' | 'meeting' | 'outreach' | 'baptism' | 'conference' | 'special';
  status?: 'planned' | 'confirmed' | 'completed' | 'cancelled';
  description?: string;
  coordinator?: string;
  updatedAt: string;
}
