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
  attribute?: string; // for extract steps e.g. "href", "src", "text"
  timeout?: number;   // milliseconds
  label?: string;     // human readable label
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  startUrl: string;
  steps: Step[];
  schedule?: string;  // cron expression
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type RunStatus = 'pending' | 'running' | 'success' | 'failed';

export interface Run {
  id: string;
  recipeId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  resultCount: number;
  logs?: Array<{
    timestamp: string;
    stepIndex: number;
    stepType: string;
    message: string;
    status: 'info' | 'success' | 'error';
  }>;
}

export interface CapturedRow {
  id: string;
  runId: string;
  data: Record<string, any>;
  capturedAt: string;
}
