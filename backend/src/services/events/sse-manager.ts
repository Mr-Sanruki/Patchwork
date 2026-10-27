import { FastifyReply } from 'fastify';
import { SseEvent } from '../../types/index.js';

export class SseManager {
  private static instance: SseManager;
  // Map of jobId -> Set of open HTTP replies
  private clients: Map<string, Set<FastifyReply>> = new Map();
  // Map of jobId -> history of emitted events for replay on reconnect
  private eventHistory: Map<string, SseEvent[]> = new Map();

  static getInstance(): SseManager {
    if (!SseManager.instance) {
      SseManager.instance = new SseManager();
    }
    return SseManager.instance;
  }

  registerClient(jobId: string, reply: FastifyReply): void {
    if (!this.clients.has(jobId)) {
      this.clients.set(jobId, new Set());
    }
    const clientSet = this.clients.get(jobId)!;
    clientSet.add(reply);

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders?.();

    // Send initial handshake
    this.sendRaw(reply, {
      type: 'job:log',
      jobId,
      data: { message: 'Connected to Patchwork live SSE stream' },
      timestamp: new Date().toISOString(),
    });

    // Replay historical events so client catches up
    const history = this.eventHistory.get(jobId) || [];
    for (const event of history) {
      this.sendRaw(reply, event);
    }

    // Clean up on disconnect
    reply.raw.on('close', () => {
      clientSet.delete(reply);
      if (clientSet.size === 0) {
        this.clients.delete(jobId);
      }
    });
  }

  broadcast(event: SseEvent): void {
    const { jobId } = event;

    // Save to history (keep up to 500 events per job)
    if (!this.eventHistory.has(jobId)) {
      this.eventHistory.set(jobId, []);
    }
    const history = this.eventHistory.get(jobId)!;
    history.push(event);
    if (history.length > 500) history.shift();

    // Broadcast to all active clients listening on this jobId
    const clientSet = this.clients.get(jobId);
    if (clientSet && clientSet.size > 0) {
      for (const reply of clientSet) {
        this.sendRaw(reply, event);
      }
    }
  }

  private sendRaw(reply: FastifyReply, event: SseEvent): void {
    try {
      reply.raw.write(`event: ${event.type}\n`);
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      // Stream may have closed
    }
  }

  clearJobHistory(jobId: string): void {
    this.eventHistory.delete(jobId);
    this.clients.delete(jobId);
  }
}
