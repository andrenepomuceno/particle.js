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
}
