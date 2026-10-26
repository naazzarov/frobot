import { DomainError } from "../public/core.js";
import { executeWorkflow } from "../public/workflow.js";
import { randomUUID } from "node:crypto";
export function createRunner({
  engine,
  store,
  change,
  provider,
  concurrency = 2,
  maxDailyCalls = 80,
  maxCompanyDailyCalls = 40,
}) {
  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 8 ||
    ![maxDailyCalls, maxCompanyDailyCalls].every(
      (v) => Number.isInteger(v) && v >= 0 && v <= 10000,
    )
  )
    throw Error("Invalid worker or provider budget configuration.");
  const controllers = new Map(),
    active = new Set();
  let timer,
    stopped = false,
    ticking = false;
  store.jobs.recover();
  async function execute(input, { fromJob = false } = {}) {
    if (stopped) throw new DomainError("Worker is stopping.", 503);
    if (controllers.size >= concurrency)
      throw new DomainError(
        "Worker capacity reached. Queue the mission instead.",
        429,
      );
    if (!fromJob && store.jobs.active(input.companyId, input.taskId))
      throw new DomainError(
        "This mission is already in the durable queue.",
        409,
      );
    const context = change(() => engine.begin(input)),
      controller = new AbortController();
    controllers.set(context.runId, controller);
    try {
      let result;
      if (provider.generateStage) {
        result = await executeWorkflow(context, provider, {
          signal: controller.signal,
          reserve: async (stage) => {
            if (provider.name !== "anthropic") return;
            const day = new Date().toISOString().slice(0, 10),
              calls = engine.state.modelCalls.filter((c) => c.day === day);
            if (
              calls.length >= maxDailyCalls ||
              calls.filter((c) => c.companyId === input.companyId).length >=
                maxCompanyDailyCalls
            )
              throw new DomainError(
                "Daily model-request budget reached. Failed and uncertain requests count toward this cap.",
                429,
              );
            change(() => {
              engine.state.modelCalls.push({
                id: randomUUID(),
                day,
                companyId: input.companyId,
                taskId: input.taskId,
                runId: context.runId,
                stage: stage.id,
                status: "reserved",
                at: new Date().toISOString(),
                usage: null,
              });
              engine.event(
                input.companyId,
                "model.requested",
                `${stage.label} request reserved within the daily cap.`,
                stage.role,
                input.taskId,
              );
            });
          },
          checkpoint: async (entry) =>
            change(() => {
              engine.checkpoint({ ...input, runId: context.runId, entry });
              const call = engine.state.modelCalls.find(
                (c) => c.runId === context.runId && c.stage === entry.stage,
              );
              if (call) {
                call.status = "complete";
                call.usage = entry.usage;
              }
            }),
        });
      } else
        result = {
          artifact: await provider.generate(context, controller.signal),
          verification: null,
        };
      return change(() =>
        engine.finish({
          ...input,
          runId: context.runId,
          artifact: result.artifact,
          provider: provider.name,
          verification: result.verification,
        }),
      );
    } catch (error) {
      if (stopped)
        throw new DomainError(
          "Worker stopped. Inspect this run after restart.",
          409,
        );
      const current = engine.task(input.companyId, input.taskId);
      if (current.status !== "running" || current.runId !== context.runId)
        throw new DomainError(
          "Run was interrupted. Its result has been discarded.",
          409,
        );
      const message =
        error instanceof DomainError
          ? error.message
          : "A workflow stage failed or did not pass validation. Inspect its trace and configuration before retrying.";
      change(() => engine.failRun({ ...input, runId: context.runId, message }));
      throw error instanceof DomainError
        ? error
        : new DomainError(message, 502);
    } finally {
      controllers.delete(context.runId);
    }
  }
  function interruptInvalid() {
    for (const [runId, controller] of controllers)
      if (
        !engine.state.tasks.some(
          (t) => t.runId === runId && t.status === "running",
        )
      )
        controller.abort();
  }
  async function tick() {
    if (stopped || ticking || engine.state.paused) return;
    ticking = true;
    try {
      for (const job of store.jobs
        .list()
        .filter(
          (j) => j.status === "queued" && Date.parse(j.runAt) <= Date.now(),
        )
        .reverse()) {
        if (controllers.size >= concurrency) break;
        try {
          engine.assertRunnable(job);
        } catch (error) {
          const task = engine.state.tasks.find(
            (t) => t.id === job.taskId && t.companyId === job.companyId,
          );
          if (!task || ["rejected", "cancelled", "done"].includes(task.status))
            store.jobs.cancelQueued(job.companyId, job.taskId);
          continue;
        }
        const claimed = store.jobs.claim(job.id);
        if (!claimed) continue;
        const heartbeat = setInterval(() => {
          if (!stopped) store.jobs.heartbeat(claimed.id, claimed.leaseToken);
        }, 30000);
        heartbeat.unref();
        const promise = execute(claimed, { fromJob: true })
          .then(() => {
            if (!stopped) store.jobs.finish(claimed, "done");
          })
          .catch((error) => {
            if (!stopped)
              store.jobs.finish(
                claimed,
                error.status === 409 ? "cancelled" : "failed",
                error.message,
              );
          })
          .finally(() => {
            clearInterval(heartbeat);
            active.delete(promise);
          });
        active.add(promise);
      }
    } finally {
      ticking = false;
    }
  }
  return {
    execute,
    interruptInvalid,
    tick,
    start() {
      if (timer) return;
      stopped = false;
      timer = setInterval(() => void tick(), 500);
      timer.unref();
      void tick();
    },
    async stop() {
      stopped = true;
      clearInterval(timer);
      timer = null;
      for (const controller of controllers.values()) controller.abort();
      await Promise.allSettled([...active]);
    },
    enqueue(input) {
      engine.assertRunnable(input);
      const date = input.runAt ? new Date(input.runAt) : new Date();
      if (
        !Number.isFinite(date.getTime()) ||
        date.getTime() > Date.now() + 30 * 86400000
      )
        throw new DomainError("Schedule a valid date within the next 30 days.");
      const job = store.jobs.enqueue({ ...input, runAt: date.toISOString() });
      change(() =>
        engine.event(
          input.companyId,
          "job.queued",
          `Background job queued for ${date.toISOString()}`,
          "Owner",
          input.taskId,
        ),
      );
      return job;
    },
    metrics() {
      const day = new Date().toISOString().slice(0, 10),
        calls = engine.state.modelCalls.filter((c) => c.day === day);
      return {
        running: controllers.size,
        concurrency,
        maxDailyCalls,
        maxCompanyDailyCalls,
        modelRequestsToday: calls.length,
        reportedInputTokens: calls.reduce(
          (n, c) => n + (c.usage?.inputTokens || 0),
          0,
        ),
        reportedOutputTokens: calls.reduce(
          (n, c) => n + (c.usage?.outputTokens || 0),
          0,
        ),
        uncertainModelRequests: calls.filter((c) => c.status === "reserved")
          .length,
      };
    },
  };
}
