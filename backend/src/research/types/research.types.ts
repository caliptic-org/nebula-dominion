export enum ResearchStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ResearchCategory {
  EKONOMI = 'ekonomi',
  ASKERI = 'askeri',
  SAVUNMA = 'savunma',
}

export enum NodeState {
  LOCKED = 'locked',
  AVAILABLE = 'available',
  RESEARCHING = 'researching',
  COMPLETED = 'completed',
}

export interface NodeCost {
  minerals: number;
  gas: number;
  timeSec: number;
}

export interface TechNodeWithState {
  id: string;
  nodeKey: string;
  race: string;
  category: ResearchCategory;
  tier: number;
  rowPosition: number;
  name: string;
  description: string;
  icon: string;
  effectText: string;
  cost: NodeCost;
  prerequisites: string[];
  effects: object;
  state: NodeState;
  progress?: number;
  startedAt?: string;
  estimatedCompletionAt?: string;
}
