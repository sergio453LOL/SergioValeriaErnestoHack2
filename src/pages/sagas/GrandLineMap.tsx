import type { SagaStage } from '../../api/types';

interface Props {
  width: number;
  height: number;
  stages: SagaStage[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

// Mapa persistente: coordenadas tal como vienen del servidor (viewBox = map.width × map.height).
export default function GrandLineMap({ width, height, stages, activeIndex, onSelect }: Props) {
  const unit = width / 100;
  const active = stages[activeIndex];
  const routePoints = stages.map((stage) => `${stage.island.x},${stage.island.y}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      // En mobile el mapa se limita en alto para dejar espacio a la narrativa debajo del panel fijo.
      className="mx-auto h-auto max-h-[28vh] w-full rounded-xl lg:max-h-none"
      role="img"
      aria-label={`Mapa del Grand Line. El barco está en ${active.island.name}, etapa ${activeIndex + 1} de ${stages.length}.`}
    >
      <rect width={width} height={height} rx={unit * 2} fill="var(--story-surface)" />
      {/* Ruta completa, tenue */}
      <polyline
        points={routePoints}
        fill="none"
        stroke="var(--story-text)"
        strokeOpacity={0.25}
        strokeWidth={unit * 0.4}
        strokeDasharray={`${unit} ${unit}`}
        strokeLinecap="round"
      />
      {/* Ruta recorrida: cada tramo se dibuja cuando la etapa activa lo alcanza */}
      {stages.slice(1).map((stage, index) => {
        const from = stages[index].island;
        const done = index + 1 <= activeIndex;
        return (
          <line
            key={stage.id}
            className="story-route-seg"
            x1={from.x}
            y1={from.y}
            x2={stage.island.x}
            y2={stage.island.y}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={done ? 0 : 1}
            stroke="var(--story-primary)"
            strokeWidth={unit * 0.7}
            strokeLinecap="round"
          />
        );
      })}
      {stages.map((stage, index) => {
        const isActive = index === activeIndex;
        const visited = index < activeIndex;
        return (
          <g key={stage.id} onClick={() => onSelect(index)} className="cursor-pointer">
            <circle
              cx={stage.island.x}
              cy={stage.island.y}
              r={isActive ? unit * 1.6 : unit * 1.1}
              fill={isActive ? 'var(--story-primary)' : visited ? 'var(--story-accent)' : 'var(--story-bg)'}
              stroke="var(--story-text)"
              strokeOpacity={0.6}
              strokeWidth={unit * 0.25}
            />
            <text
              x={stage.island.x}
              y={stage.island.y + (stage.island.y > height - unit * 6 ? -unit * 2.6 : unit * 4.2)}
              // Cerca de los bordes el nombre se alinea hacia adentro para no cortarse.
              textAnchor={stage.island.x < width * 0.15 ? 'start' : stage.island.x > width * 0.85 ? 'end' : 'middle'}
              fontSize={unit * 2.2}
              fontWeight={isActive ? 700 : 400}
              fill="var(--story-text)"
              fillOpacity={isActive ? 1 : 0.7}
            >
              {stage.island.name}
            </text>
          </g>
        );
      })}
      {/* Barco en la isla de la etapa activa */}
      <g className="story-ship" style={{ transform: `translate(${active.island.x}px, ${active.island.y}px)` }} aria-hidden="true">
        <g transform={`translate(0 ${-unit * 3.4}) scale(${unit / 10})`}>
          <path d="M-14 4 L14 4 L9 12 L-9 12 Z" fill="var(--story-text)" />
          <path d="M0 -16 L0 4" stroke="var(--story-text)" strokeWidth={2} />
          <path d="M1 -15 L13 0 L1 0 Z" fill="var(--story-accent)" />
        </g>
      </g>
    </svg>
  );
}
