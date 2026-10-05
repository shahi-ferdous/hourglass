export interface PublicPollResponse {
  id: string;
  title: string;
  requiresViewPassword: boolean;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  hostTimezone?: string;
  hostName?: string | null;
  windowDates?: string[];
  windowStartMinute?: number;
  windowEndMinute?: number;
  slotMinutes?: 15 | 30 | 60;
  status?: "active" | "closed";
  finalStartAt?: string | null;
  finalEndAt?: string | null;
  hasHostPassword?: boolean;
  viewerParticipantId?: string | null;
  viewerIsHost?: boolean;
}

export interface OverlapResponse {
  totalParticipants: number;
  hostParticipantId: string | null;
  participants: { id: string; displayName: string; isHost: boolean }[];
  slots: { startAt: string; count: number; participantIds: string[] }[];
}

export interface ManageParticipant {
  id: string;
  displayName: string;
  isHost: boolean;
  timezone: string | null;
  lastSeenAt: string;
  slots: string[];
}

export interface ManageResponse {
  poll: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    meetingUrl: string | null;
    hostTimezone: string;
    windowDates: string[];
    windowStartMinute: number;
    windowEndMinute: number;
    slotMinutes: 15 | 30 | 60;
    status: "active" | "closed";
    finalStartAt: string | null;
    finalEndAt: string | null;
    hasViewPassword: boolean;
    hasHostPassword: boolean;
    createdAt: string;
    closedAt: string | null;
  };
  participants: ManageParticipant[];
}
