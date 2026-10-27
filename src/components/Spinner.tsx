interface Props {
  size?: 'sm' | 'lg';
}

export default function Spinner({ size = 'sm' }: Props) {
  const dimensions = size === 'lg' ? 'h-10 w-10 border-4' : 'h-4 w-4 border-2';
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block animate-spin rounded-full border-gold/30 border-t-gold motion-reduce:animate-none ${dimensions}`}
    />
  );
}
