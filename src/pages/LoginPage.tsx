import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { toApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { readLoginState } from '../auth/guards';
import AuthCard from '../components/AuthCard';
import TextField from '../components/TextField';
import Spinner from '../components/Spinner';

type Field = 'email' | 'password';

export default function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const { expired } = readLoginState(location.state);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const errors: Partial<Record<Field, string>> = {};
    if (!email.trim()) errors.email = 'Ingresa el email de la tripulación.';
    if (!password) errors.password = 'Ingresa la contraseña.';
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      // Al iniciar sesión, PublicOnly redirige a la ruta que el usuario quería visitar.
      await login({ email: email.trim(), password });
    } catch (error) {
      const apiError = toApiError(error);
      const serverErrors: Partial<Record<Field, string>> = {};
      for (const detail of apiError.details) {
        if (detail.field === 'email' || detail.field === 'password') serverErrors[detail.field] = detail.message;
      }
      setFieldErrors(serverErrors);
      setFormError(
        apiError.code === 'INVALID_CREDENTIALS' ? 'Email o contraseña incorrectos.' : apiError.message,
      );
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Iniciar sesión" subtitle="Ingresa con la cuenta de tu tripulación">
      {expired && (
        <p role="status" className="mb-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-gold">
          Tu sesión expiró. Vuelve a iniciar sesión para continuar.
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-2">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          maxLength={120}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          maxLength={120}
        />
        {formError && (
          <p role="alert" className="rounded-lg bg-coral/10 p-3 text-sm text-coral">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 font-semibold text-sea-950 hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Spinner />}
          {submitting ? 'Zarpando…' : 'Zarpar'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Tu tripulación aún no tiene cuenta?{' '}
        <Link to="/register" state={location.state} className="text-gold hover:underline">
          Regístrala
        </Link>
      </p>
    </AuthCard>
  );
}
