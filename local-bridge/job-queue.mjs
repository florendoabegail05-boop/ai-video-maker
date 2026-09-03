/** AI Video Maker — dependency-free local job queue. Serializes heavy AI work and supports safe retry. */
export class LocalJobQueue {
  constructor({ concurrency = 1, maxRetries = 1 } = {}) {
    this.concurrency = Math.max(1, Number(concurrency) || 1);
    this.maxRetries = Math.max(0, Number(maxRetries) || 0);
    this.active = 0;
    this.nextId = 1;
    this.pending = [];
    this.jobs = new Map();
  }

  add(kind, task, options = {}) {
    const id = options.id || `job-${Date.now()}-${this.nextId++}`;
    const job = { id, kind, task, retries: 0, status: 'queued', createdAt: new Date().toISOString(), startedAt: null, finishedAt: null, error: null };
    this.jobs.set(id, job);
    this.pending.push(job);
    this.#drain();
    return id;
  }

  get(id) {
    const job = this.jobs.get(id);
    if (!job) return null;
    return { id: job.id, kind: job.kind, status: job.status, retries: job.retries, createdAt: job.createdAt, startedAt: job.startedAt, finishedAt: job.finishedAt, error: job.error };
  }

  stats() {
    return { active: this.active, queued: this.pending.length, totalTracked: this.jobs.size, concurrency: this.concurrency, maxRetries: this.maxRetries };
  }

  async #run(job) {
    this.active += 1;
    job.status = 'running';
    job.startedAt = job.startedAt || new Date().toISOString();
    try {
      const result = await job.task(job);
      job.status = 'completed';
      job.finishedAt = new Date().toISOString();
      return result;
    } catch (error) {
      job.error = error?.message || String(error);
      if (job.retries < this.maxRetries && error?.retryable !== false) {
        job.retries += 1;
        job.status = 'retrying';
        await new Promise(resolve => setTimeout(resolve, Math.min(5000, 1000 * job.retries)));
        return this.#run(job);
      }
      job.status = 'failed';
      job.finishedAt = new Date().toISOString();
      throw error;
    } finally {
      this.active -= 1;
    }
  }

  #drain() {
    while (this.active < this.concurrency && this.pending.length) {
      const job = this.pending.shift();
      this.#run(job).catch(() => {}).finally(() => this.#drain());
    }
  }
}
