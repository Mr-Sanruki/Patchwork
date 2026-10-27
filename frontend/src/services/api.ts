import { Job, Candidate, TavilySource, PipelineLog, BenchmarkRecord, SseEvent } from '../types';

export interface CreateJobParams {
  repoUrl: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  runnerType?: 'docker' | 'nebius';
  candidateCount?: number;
  maxRounds?: number;
}

export interface JobDetailResponse {
  job: Job;
  candidates: Candidate[];
  sources: TavilySource[];
  logs: PipelineLog[];
}

export async function createJob(params: CreateJobParams): Promise<Job> {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create job (${res.status})`);
  }

  return res.json();
}

export async function getJob(id: string): Promise<JobDetailResponse> {
  const res = await fetch(`/api/jobs/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch job (${res.status})`);
  return res.json();
}

export async function listJobs(): Promise<Job[]> {
  const res = await fetch('/api/jobs');
  if (!res.ok) throw new Error('Failed to list jobs');
  return res.json();
}

export async function listBenchmarks(): Promise<BenchmarkRecord[]> {
  const res = await fetch('/api/benchmarks');
  if (!res.ok) throw new Error('Failed to list benchmarks');
  return res.json();
}

export async function getModels(): Promise<any> {
  const res = await fetch('/api/models');
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function getConfig(): Promise<any> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function approveJob(id: string): Promise<{ success: boolean; prUrl?: string; message: string }> {
  const res = await fetch(`/api/jobs/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to approve job');
  return res.json();
}

export function subscribeToJobEvents(
  jobId: string,
  onEvent: (event: SseEvent) => void,
  onError?: (err: any) => void
): () => void {
  const eventSource = new EventSource(`/api/jobs/${jobId}/events`);

  const eventTypes = [
    'job:status',
    'job:log',
    'candidate:created',
    'candidate:update',
    'tavily:source',
    'job:completed',
    'job:failed',
  ];

  for (const type of eventTypes) {
    eventSource.addEventListener(type, (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.error('Failed to parse SSE event data', err);
      }
    });
  }

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}
