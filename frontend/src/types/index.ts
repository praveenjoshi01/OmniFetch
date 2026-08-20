export type StepType = 
  | 'navigate'
  | 'click'
  | 'type'
  | 'wait'
  | 'extract'
  | 'scroll'
  | 'paginate'
  | 'screenshot';

export interface Step {
  id: string;
  type: StepType;
  selector?: string;
  value?: string;
  attribute?: string;
  timeout?: number;
  label?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  startUrl: string;
  steps: Step[];
  schedule?: string;
  webhookUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RunStatus = 'pending' | 'running' | 'success' | 'failed';

export interface LogEntry {
  timestamp: string;
  stepIndex: number;
  stepType: string;
  message: string;
  status: 'info' | 'success' | 'error';
}

export interface Run {
  id: string;
  recipeId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  resultCount: number;
  logs?: LogEntry[];
}

export interface CapturedRow {
  id: string;
  runId: string;
  data: Record<string, any>;
  capturedAt: string;
}

export interface SelectedElement {
  selector: string;
  text: string;
  tagName: string;
  attributes: Record<string, string>;
}
