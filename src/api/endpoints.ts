import { api } from './client';
import type {
  Crew,
  DashboardSummary,
  LoginRequest,
  LoginResponse,
  LogPose,
  MeResponse,
  NewsDetail,
  NewsFeed,
  NewsFeedQuery,
  NewsVerdict,
  RegisterRequest,
  SagaStory,
  SagaSummary,
  WantedDetail,
  WantedPage,
  WantedQuery,
} from './types';

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', body);
  return response.data;
}

export async function register(body: RegisterRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/register', body);
  return response.data;
}

export async function getMe(signal?: AbortSignal): Promise<MeResponse> {
  const response = await api.get<MeResponse>('/auth/me', { signal });
  return response.data;
}

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>('/dashboard/summary', { signal });
  return response.data;
}

export async function getLogPose(signal?: AbortSignal): Promise<LogPose> {
  const response = await api.get<LogPose>('/log-pose', { signal });
  return response.data;
}

export async function getCrews(signal?: AbortSignal): Promise<Crew[]> {
  const response = await api.get<Crew[]>('/crews', { signal });
  return response.data;
}

export async function getWanted(query: WantedQuery, signal?: AbortSignal): Promise<WantedPage> {
  const response = await api.get<WantedPage>('/wanted', { params: query, signal });
  return response.data;
}

export async function getNewsFeed(query: NewsFeedQuery, signal?: AbortSignal): Promise<NewsFeed> {
  const response = await api.get<NewsFeed>('/news/feed', { params: query, signal });
  return response.data;
}

export async function getNewsById(id: string, signal?: AbortSignal): Promise<NewsDetail> {
  const response = await api.get<NewsDetail>(`/news/${encodeURIComponent(id)}`, { signal });
  return response.data;
}

export async function updateNewsStatus(id: string, status: NewsVerdict): Promise<NewsDetail> {
  const response = await api.patch<NewsDetail>(`/news/${encodeURIComponent(id)}/status`, { status });
  return response.data;
}

export async function getSagas(signal?: AbortSignal): Promise<SagaSummary[]> {
  const response = await api.get<SagaSummary[]>('/sagas', { signal });
  return response.data;
}

export async function getSagaStory(id: string, signal?: AbortSignal): Promise<SagaStory> {
  const response = await api.get<SagaStory>(`/sagas/${encodeURIComponent(id)}/story`, { signal });
  return response.data;
}

export async function getWantedById(id: string, signal?: AbortSignal): Promise<WantedDetail> {
  const response = await api.get<WantedDetail>(`/wanted/${encodeURIComponent(id)}`, { signal });
  return response.data;
}
