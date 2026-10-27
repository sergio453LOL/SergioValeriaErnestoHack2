import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-display text-7xl text-gold">404</p>
      <h1 className="font-display text-2xl text-parchment">Esta isla no aparece en ningún mapa</h1>
      <p className="max-w-md text-slate-400">
        El Log Pose no encuentra la ruta que buscas. Puede que la dirección esté mal escrita o que la página ya no
        exista.
      </p>
      <Link to="/" className="mt-4 rounded-lg bg-gold px-4 py-2 font-semibold text-sea-950 hover:bg-gold/90">
        Volver al puerto
      </Link>
    </main>
  );
}
