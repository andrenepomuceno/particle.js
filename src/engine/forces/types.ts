export type ForceMode = 'force' | 'potential';
export type ForceRange = 'long' | 'short';

export interface ForceParam {
  name: string;
  value: number;
}

export interface ForceDefinition {
  id: string;
  name: string;
  enabled: boolean;
  mode: ForceMode;
  expression: string;
  range: ForceRange;
  cutoff: number;
  softening: number;
  params: ForceParam[];
  /**
   * Force mode only: j is read on i's past light cone (Minkowski metric; instantaneous under
   * Galilean, where c → ∞). Omitted means false.
   */
  retarded?: boolean;
}
