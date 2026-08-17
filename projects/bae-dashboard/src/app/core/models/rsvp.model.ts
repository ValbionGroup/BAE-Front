export type RsvpStatus = 'none' | 'attending' | 'absent';

export interface RsvpEntry {
  memberId: string;
  eventId: string;
  status: RsvpStatus;
}
