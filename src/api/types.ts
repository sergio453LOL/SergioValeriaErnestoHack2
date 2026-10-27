// Tipos del contrato público (Swagger: /openapi.json)

export type WantedStatus = 'AT_LARGE' | 'CAPTURED' | 'MISSING';
export type FruitType = 'PARAMECIA' | 'ZOAN' | 'LOGIA';
export type FruitFilter = FruitType | 'NONE';
export type WantedSort = 'bounty,desc' | 'name,asc' | 'updatedAt,desc';
export type PageSize = 10 | 20 | 50;
export type CrewRole =
  | 'CAPTAIN'
  | 'FIRST_MATE'
  | 'NAVIGATOR'
  | 'SNIPER'
  | 'COOK'
  | 'DOCTOR'
  | 'SHIPWRIGHT'
  | 'MUSICIAN'
  | 'ARCHAEOLOGIST'
  | 'HELMSMAN'
  | 'FIGHTER';
export type LogPoseStatus = 'LOCKED' | 'UNLOCKED';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Team {
  code: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  teamName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: User;
  team: Team;
}

export interface MeResponse {
  user: User;
  team: Team;
  expiresAt: string;
}

export interface CrewRef {
  id: string;
  name: string;
}

export interface Crew {
  id: string;
  name: string;
  shipName: string;
  jollyRogerColor: string;
  memberCount: number;
  totalBounty: number;
}

export interface DevilFruit {
  name: string;
  type: FruitType;
}

export interface WantedSummary {
  id: string;
  name: string;
  epithet: string;
  bounty: number;
  status: WantedStatus;
  crew: CrewRef;
  role: CrewRole;
  devilFruit: DevilFruit | null;
  threatLevel: number;
  lastSeenIsland: string;
  updatedAt: string;
}

export interface WantedDetail extends WantedSummary {
  age: number;
  heightCm: number;
  bio: string;
  lastSeen: { island: string; seenAt: string };
  bountyHistory: { amount: number; issuedAt: string }[];
}

export interface WantedPage {
  content: WantedSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface WantedQuery {
  page: number;
  size: PageSize;
  sort: WantedSort;
  status?: WantedStatus;
  crewId?: string;
  fruit?: FruitFilter;
  q?: string;
}

export interface DashboardSummary {
  team: Team;
  wanted: {
    total: number;
    totalBounty: number;
    averageBounty: number;
    byStatus: Record<WantedStatus, number>;
    byFruit: Record<FruitFilter, number>;
  };
  crews: {
    total: number;
    mostWanted: Crew | null;
  };
  topBounties: WantedSummary[];
  generatedAt: string;
}

export interface LogPose {
  status: LogPoseStatus;
  grandLineUnlocked: boolean;
  unlockedAt: string | null;
  message: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  traceId: string;
  details?: FieldError[];
  retryAfterSeconds?: number;
}
