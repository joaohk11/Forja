import { useMemo } from 'react';
import { RadarChart } from './RadarChart';
import { useApp } from '@/lib/context';
import {
  PHYSICAL_ATTRIBUTES, TECHNICAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTE_LABELS, TECHNICAL_ATTRIBUTE_LABELS,
  getAthleteAttributeScore, Athlete,
} from '@/lib/types';

interface TeamRadarsProps {
  teamId: string;
  size?: number;
}

export function TeamRadars({ teamId, size = 220 }: TeamRadarsProps) {
  const { data } = useApp();

  const teamAthletes = useMemo(
    () => data.athletes.filter(a => a.teamId === teamId),
    [data.athletes, teamId]
  );

  const physicalAvg = useMemo(() => {
    if (teamAthletes.length === 0) return PHYSICAL_ATTRIBUTES.map(() => 0);
    return PHYSICAL_ATTRIBUTES.map(attr => {
      const scores = teamAthletes.map(a =>
        getAthleteAttributeScore(a.id, attr, data.evalTests || [], data.evalResults || [])
      );
      return scores.reduce((s, v) => s + v, 0) / scores.length;
    });
  }, [teamAthletes, data.evalTests, data.evalResults]);

  const technicalAvg = useMemo(() => {
    if (teamAthletes.length === 0) return TECHNICAL_ATTRIBUTES.map(() => 0);
    return TECHNICAL_ATTRIBUTES.map(attr => {
      const scores = teamAthletes.map(a =>
        getAthleteAttributeScore(a.id, attr, data.evalTests || [], data.evalResults || [])
      );
      return scores.reduce((s, v) => s + v, 0) / scores.length;
    });
  }, [teamAthletes, data.evalTests, data.evalResults]);

  const physicalLabels = PHYSICAL_ATTRIBUTES.map(a => PHYSICAL_ATTRIBUTE_LABELS[a]);
  const technicalLabels = TECHNICAL_ATTRIBUTES.map(a => TECHNICAL_ATTRIBUTE_LABELS[a]);

  if (teamAthletes.length === 0) {
    return (
      <div className="card-surface neon-border rounded-lg p-6 text-center">
        <p className="text-muted-foreground font-body text-sm">Sem dados de avaliação</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card-surface neon-border rounded-lg p-3">
        <RadarChart labels={physicalLabels} values={physicalAvg} title="Físico do Time" size={size} />
      </div>
      <div className="card-surface neon-border rounded-lg p-3">
        <RadarChart labels={technicalLabels} values={technicalAvg} title="Técnico do Time" size={size} />
      </div>
    </div>
  );
}
