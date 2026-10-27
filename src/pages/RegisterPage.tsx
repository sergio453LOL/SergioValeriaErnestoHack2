import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { toApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AuthCard from '../components/AuthCard';
import TextField from '../components/TextField';
import Spinner from '../components/Spinner';

type Field = 'teamName' | 'email' | 'password';
type FieldErrors = Partial<Record<Field, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isField(value: string): value is Field {
  return value === 'teamName' || value === 'email' || value === 'password';
}

// Mismas reglas que el contrato de POST /auth/register.
function validate(teamName: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const name = teamName.trim();
  if (name.length < 3 || name.length > 40) errors.teamName = 'El nombre debe tener entre 3 y 40 caracteres.';
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Ingresa un email válido.';
  if (password.length < 8 || password.length > 72) errors.password = 'La contraseña debe tener entre 8 y 72 caracteres.';
  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const location = useLocation();

  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const errors = validate(teamName, email, password);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      // El registro devuelve la sesión iniciada: PublicOnly entra directo a la app.
      await register({ teamName: teamName.trim(), email: email.trim(), password });
    } catch (error) {
      const apiError = toApiError(error);
      const serverErrors: FieldErrors = {};
      if (apiError.code === 'EMAIL_ALREADY_REGISTERED') serverErrors.email = apiError.message;
      if (apiError.code === 'TEAM_NAME_TAKEN') serverErrors.teamName = apiError.message;
      for (const detail of apiError.details) {
        if (isField(detail.field)) serverErrors[detail.field] = detail.message;
      }
      setFieldErrors(serverErrors);
      // Si el error no corresponde a un campo concreto, se muestra arriba del botón.
      setFormError(Object.keys(serverErrors).length === 0 ? apiError.message : null);
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Registrar tripulación" subtitle="Una cuenta por equipo: los tres integrantes la comparten">
      <form onSubmit={handleSubmit} noValidate className="space-y-2">
        <TextField
          label="Nombre de la tripulación"
          autoComplete="organization"
          value={teamName}
          onChange={(event) => setTeamName(event.target.value)}
          error={fieldErrors.teamName}
          maxLength={40}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          maxLength={72}
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
          {submitting ? 'Registrando…' : 'Registrar y zarpar'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Ya tienen cuenta?{' '}
        <Link to="/login" state={location.state} className="text-gold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthCard>
  );
}
