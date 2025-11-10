// Fix: Import React to provide the React namespace for React.ReactNode.
import React from 'react';

export enum AppointmentStatus {
  Scheduled = 'Agendado',
  InProgress = 'Em Andamento',
  Finished = 'Finalizado',
}

export interface Car {
  id: string;
  plate: string;
  model: string;
  protections: string[];
}

export interface MonthlyPlan {
  id:string;
  name: string;
  price: number; // in BRL
  includedServices: {
    serviceId: string;
    quantity: number;
  }[];
}

export interface ClientPlanUsage {
  clientId: string;
  cycleStartDate: string; // YYYY-MM-DD
  usedServices: {
    [serviceId: string]: number;
  };
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  whatsapp: string;
  cars: Car[];
  monthlyPlanId?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number; // in BRL
  maintenanceIntervalMonths?: number; // in months
  sourceFileId?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  carId: string;
  serviceIds: string[]; // Alterado de serviceId para serviceIds
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: AppointmentStatus;
  isPlanService?: boolean;
  paymentMethod?: 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro';
}

export interface NotificationItem {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface OperatingHours {
    daysOpen: number[];
    availableTimes: string[];
}

export interface AutomatedMessage {
  id:string;
  name: string;
  enabled: boolean;
  trigger: 'before_appointment' | 'after_service_finished' | 'service_maintenance_due';
  value: number; // hours before or days after
  unit: 'hours' | 'days';
  message: string;
}

export interface ChatMessageData {
  sender: 'Cliente' | 'CAR CLASS';
  isBot: boolean;
  content: React.ReactNode;
  operatorName?: string;
}

export interface ConversationLog {
  id: string;
  clientId: string;
  timestamp: Date;
  messages: ChatMessageData[];
}

// --- NOVOS TIPOS PARA GERENCIAMENTO DE USUÁRIOS ---

export type UserRole = 'owner' | 'employee';

export const ALL_TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'clients', label: 'Clientes' },
    { id: 'services', label: 'Serviços' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'settings', label: 'Ajustes' }
];

export interface User {
  id: string;
  username: string;
  password: string; // In a real app, this should be a hash
  role: UserRole;
  permissions: {
    [tabId: string]: boolean;
  };
}
