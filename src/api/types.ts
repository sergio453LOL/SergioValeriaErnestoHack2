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

// ---- Grand Line: noticias ----

export type NewsType = 'BOUNTY_UPDATE' | 'BATTLE' | 'MARINE_OPERATION' | 'WORLD_GOVERNMENT' | 'DISCOVERY';
export type NewsPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NewsStatus = 'RUMOR' | 'CONFIRMED' | 'DEBUNKED';
export type NewsVerdict = 'CONFIRMED' | 'DEBUNKED';

export interface NewsItem {
  id: string;
  type: NewsType;
  priority: NewsPriority;
  status: NewsStatus;
  title: string;
  summary: string;
  source: string;
  island: string;
  relatedWanted: { id: string; name: string } | null;
  publishedAt: string;
  updatedAt: string;
  verifiedAt: string | null;
}

export interface NewsDetail extends NewsItem {
  body: string[];
}

export interface NewsFilters {
  type?: NewsType;
  priority?: NewsPriority;
  status?: NewsStatus;
}

export interface NewsFeedQuery extends NewsFilters {
  cursor?: string;
  limit: number;
}

export interface NewsFeed {
  items: NewsItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ---- Grand Line: sagas ----

export interface Palette {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
}

export interface SagaSummary {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  synopsis: string;
  stageCount: number;
  totalDistanceNm: number;
  firstIsland: string;
  lastIsland: string;
  palette: Palette;
}

export type StageMetricKey = 'distanceNm' | 'crewMorale' | 'bountyPool' | 'marineThreat';

export interface StageMetric {
  key: StageMetricKey;
  label: string;
  value: number;
  unit: string;
}

export interface SagaStage {
  id: string;
  order: number;
  slug: string;
  title: string;
  narrative: string[];
  island: { id: string; name: string; x: number; y: number };
  palette: Palette;
  metrics: StageMetric[];
}

export interface SagaStory {
  saga: SagaSummary & { intro: string };
  map: { width: number; height: number };
  stages: SagaStage[];
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
  current?: NewsDetail;
}
