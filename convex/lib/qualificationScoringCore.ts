export interface QualificationScoreBreakdown {
  profileFit: number;
  signalQuality: number;
  intentStrength: number;
  recency: number;
  total: number;
}

export type QualificationScoreComponents = Omit<
  QualificationScoreBreakdown,
  "total"
>;

export const QUALIFICATION_SCORE_MAXIMUMS = {
  profileFit: 30,
  signalQuality: 30,
  intentStrength: 25,
  recency: 15,
} as const;

export function calculateQualificationScore(
  components: QualificationScoreComponents
): QualificationScoreBreakdown {
  const profileFit = Math.round(components.profileFit);
  const signalQuality = Math.round(components.signalQuality);
  const intentStrength = Math.round(components.intentStrength);
  const recency = Math.round(components.recency);

  return {
    profileFit,
    signalQuality,
    intentStrength,
    recency,
    total: profileFit + signalQuality + intentStrength + recency,
  };
}

export function createEmptyQualificationScoreBreakdown(): QualificationScoreBreakdown {
  return calculateQualificationScore({
    profileFit: 0,
    signalQuality: 0,
    intentStrength: 0,
    recency: 0,
  });
}
