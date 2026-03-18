import { useMemo } from 'react';

interface RadarChartProps {
  labels: string[];
  values: number[];
  maxValue?: number;
  size?: number;
  title?: string;
}

export function RadarChart({ labels, values, maxValue = 100, size = 260, title }: RadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) - 40;
  const levels = 5;

  const points = useMemo(() => {
    const n = labels.length;
    return labels.map((_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return { x: Math.cos(angle), y: Math.sin(angle) };
    });
  }, [labels.length]);

  const levelPolygons = useMemo(() => {
    return Array.from({ length: levels }, (_, l) => {
      const r = (radius * (l + 1)) / levels;
      return points.map(p => `${center + p.x * r},${center + p.y * r}`).join(' ');
    });
  }, [points, radius, center]);

  const dataPolygon = useMemo(() => {
    return points.map((p, i) => {
      const v = Math.min(values[i] || 0, maxValue);
      const r = (v / maxValue) * radius;
      return `${center + p.x * r},${center + p.y * r}`;
    }).join(' ');
  }, [points, values, maxValue, radius, center]);

  const labelPositions = useMemo(() => {
    return points.map((p, i) => ({
      x: center + p.x * (radius + 22),
      y: center + p.y * (radius + 22),
      label: labels[i],
      value: Math.round(values[i] || 0),
    }));
  }, [points, labels, values, radius, center]);

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h4 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">{title}</h4>
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid levels */}
        {levelPolygons.map((poly, i) => (
          <polygon
            key={i}
            points={poly}
            fill="none"
            stroke="hsl(var(--primary) / 0.15)"
            strokeWidth={0.5}
          />
        ))}

        {/* Axis lines */}
        {points.map((p, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + p.x * radius}
            y2={center + p.y * radius}
            stroke="hsl(var(--primary) / 0.2)"
            strokeWidth={0.5}
          />
        ))}

        {/* Data area */}
        <polygon
          points={dataPolygon}
          fill="hsl(var(--primary) / 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
        />

        {/* Data points */}
        {points.map((p, i) => {
          const v = Math.min(values[i] || 0, maxValue);
          const r = (v / maxValue) * radius;
          return (
            <circle
              key={i}
              cx={center + p.x * r}
              cy={center + p.y * r}
              r={3}
              fill="hsl(var(--primary))"
              className="drop-shadow-[0_0_4px_hsl(var(--primary))]"
            />
          );
        })}

        {/* Labels */}
        {labelPositions.map((lp, i) => (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: '9px', fontFamily: 'var(--font-mono, monospace)' }}
          >
            {lp.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
