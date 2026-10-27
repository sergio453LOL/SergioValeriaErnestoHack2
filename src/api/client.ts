import axios, { AxiosError } from 'axios';
import type { ApiErrorBody, FieldError, NewsDetail } from './types';

const TOKEN_KEY = 'logpose.token';

// La URL base viene de VITE_API_BASE_URL (.env), nunca escrita en el código.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// AuthContext registra aquí qué hacer cuando la sesión deja de ser válida.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof AxiosError && error.response?.status === 401) {
      const url = error.config?.url ?? '';
      // En login/registro un 401 significa credenciales incorrectas, no sesión vencida.
      const isAuthForm = url.startsWith('/auth/login') || url.startsWith('/auth/register');
      if (!isAuthForm) {
        clearToken();
        onUnauthorized?.();
      }
    }
    return Promise.reject(error);
  },
);

export class ApiError extends Error {
  status: number;
  code: string;
  details: FieldError[];
  // Solo en 409 NEWS_ALREADY_VERIFIED: la noticia tal como está ahora en el servidor.
  current: NewsDetail | null;

  constructor(status: number, code: string, message: string, details: FieldError[] = [], current: NewsDetail | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.current = current;
  }
}

// 423: endpoint del Grand Line sin Log Pose. El bloqueo lo aplica el servidor; solo lo mostramos.
export function isLogPoseLocked(error: ApiError): boolean {
  return error.status === 423 || error.code === 'LOG_POSE_REQUIRED';
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
}

export function isCanceled(error: unknown): boolean {
  return axios.isCancel(error);
}

// Convierte cualquier error (red, servidor o contrato) en un ApiError con mensaje legible.
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    const body: unknown = error.response?.data;
    if (error.response && isApiErrorBody(body)) {
      return new ApiError(error.response.status, body.code, body.message, body.details ?? [], body.current ?? null);
    }
    if (error.response) {
      return new ApiError(error.response.status, 'HTTP_ERROR', `El servidor respondió ${error.response.status}.`);
    }
    return new ApiError(0, 'NETWORK_ERROR', 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
  }
  return new ApiError(0, 'UNKNOWN', 'Ocurrió un error inesperado.');
}
