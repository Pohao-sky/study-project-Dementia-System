export interface TrailMakingANode {
  label: number;
  x: number;
  y: number;
}

export interface TrailMakingALine {
  from: TrailMakingANode;
  to: TrailMakingANode;
}

export interface TrailMakingBNode {
  type: 'num' | 'char';
  label: string;
  x: number;
  y: number;
}

export interface TrailMakingBLine {
  from: TrailMakingBNode;
  to: TrailMakingBNode;
}
