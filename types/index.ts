export type UserRole = 'superadmin' | 'hospital_admin' | 'staff' | 'patient';
export type TokenStatus = 'waiting' | 'called' | 'completed' | 'cancelled';
export type BedType = 'general' | 'icu' | 'emergency';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  hospitalId?: string;
  deptId?: string;
  isFirstLogin?: boolean;
  cityId?: string;
  phone?: string;
  createdAt?: number;
}

export interface City {
  id: string;
  name: string;
  state: string;
  isLive: boolean;
  waitlistCount?: number;
}

export interface Hospital {
  id: string;
  name: string;
  cityId: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  specialties: string[];
  isActive: boolean;
  adminUid?: string;
}

export interface Department {
  id: string;
  name: string;
  specialty: string;
  doctorName: string;
}

export interface Admission {
  _id: string;
  name: string;
  age: number;
  contact: string;
  contactType: 'phone' | 'email';
  bedNumber: string;
  admittedAt: number;
}

export interface BedCount {
  total: number;
  occupied: number;
  admissions: Admission[];
}

export interface HospitalBeds {
  general: BedCount;
  icu: BedCount;
  emergency: BedCount;
}

export interface QueueStatus {
  currentToken: number;
  totalWaiting: number;
  estimatedWaitMinutes: number;
  isOpen: boolean;
}

export interface Token {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  hospitalId: string;
  hospitalName: string;
  deptId: string;
  deptName: string;
  tokenNumber: number;
  status: TokenStatus;
  appointmentDate?: string;
  createdAt: number;
  calledAt?: number;
  completedAt?: number;
}

export interface Medicine {
  name: string;
  dosage: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  tokenId: string;
  userId: string;
  hospitalId: string;
  deptId: string;
  medicines: Medicine[];
  bedRestDays: number;
  diagnosis: string;
  bedAssigned?: string;
  patientName?: string;
  patientContact?: string;
  bedRequired: boolean;
  bedType?: BedType;
  bedStatus: 'pending' | 'allocated';
  createdAt: number;
  createdBy: string;
}

export interface StaffMember {
  uid: string;
  name: string;
  email: string;
  role: 'hospital_admin' | 'staff';
  deptId?: string;
  hospitalId: string;
  isFirstLogin: boolean;
}

export interface WaitlistEntry {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  joinedAt: number;
}
