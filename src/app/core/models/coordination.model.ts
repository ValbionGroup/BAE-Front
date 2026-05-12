import {
  LucideFlame,
  LucideWine,
  LucideCreditCard,
  LucideShield,
  LucideMusic,
  LucideSmile,
  LucideIconInput,
} from '@lucide/angular';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Role {
  id: string;
  name: string;
  icon: LucideIconInput;
  requiredCount: number;
  assignedMemberIds: string[];
}

export interface SoireeEvent {
  id: string;
  name: string;
  date: Date;
}

export interface EventData {
  event: SoireeEvent;
  presentMemberIds: string[];
  roles: Role[];
}

export const MEMBERS: Member[] = [
  { id: 'm1', firstName: 'Lucas', lastName: 'Espiet' },
  { id: 'm2', firstName: 'Marie', lastName: 'Dupont' },
  { id: 'm3', firstName: 'Thomas', lastName: 'Martin' },
  { id: 'm4', firstName: 'Chloé', lastName: 'Bernard' },
  { id: 'm5', firstName: 'Antoine', lastName: 'Petit' },
  { id: 'm6', firstName: 'Camille', lastName: 'Roux' },
  { id: 'm7', firstName: 'Paul', lastName: 'Moreau' },
  { id: 'm8', firstName: 'Julie', lastName: 'Simon' },
  { id: 'm9', firstName: 'Nicolas', lastName: 'Laurent' },
  { id: 'm10', firstName: 'Emma', lastName: 'Lefebvre' },
];

export const AVATAR_COLORS: string[] = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500',
];

export function createInitialEventsData(): EventData[] {
  // Build today's date at midnight for the active-event seed
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

  return [
    {
      event: { id: 'e1', name: 'Soirée Electro', date: new Date(todayYear, todayMonth, todayDay) },
      presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 2, assignedMemberIds: ['m1', 'm2'] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 2, assignedMemberIds: ['m3', 'm4'] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 1, assignedMemberIds: ['m5'] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 1, assignedMemberIds: ['m6'] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: ['m7'] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 1, assignedMemberIds: ['m8'] },
      ],
    },
    {
      event: { id: 'e2', name: 'Soirée Hip-Hop', date: new Date(2026, 3, 11) },
      presentMemberIds: ['m1', 'm3', 'm5', 'm7', 'm9', 'm2', 'm4', 'm6'],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 2, assignedMemberIds: ['m9', 'm1'] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 2, assignedMemberIds: ['m3', 'm5'] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 1, assignedMemberIds: ['m7'] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 1, assignedMemberIds: ['m2'] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: ['m4'] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 1, assignedMemberIds: ['m6'] },
      ],
    },
    {
      event: { id: 'e3', name: 'Soirée Jungle', date: new Date(2026, 4, 16) },
      presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 3, assignedMemberIds: ['m1'] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 3, assignedMemberIds: ['m3', 'm4'] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 2, assignedMemberIds: ['m5', 'm6'] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 2, assignedMemberIds: ['m7'] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: [] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 2, assignedMemberIds: ['m2'] },
      ],
    },
    {
      event: { id: 'e4', name: 'Soirée Techno', date: new Date(2026, 5, 13) },
      presentMemberIds: [],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 3, assignedMemberIds: [] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 3, assignedMemberIds: [] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 2, assignedMemberIds: [] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 2, assignedMemberIds: [] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: [] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 2, assignedMemberIds: [] },
      ],
    },
    {
      event: { id: 'e5', name: 'Soirée Latino', date: new Date(2026, 6, 4) },
      presentMemberIds: [],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 3, assignedMemberIds: [] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 3, assignedMemberIds: [] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 2, assignedMemberIds: [] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 2, assignedMemberIds: [] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: [] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 2, assignedMemberIds: [] },
      ],
    },
  ];
}
