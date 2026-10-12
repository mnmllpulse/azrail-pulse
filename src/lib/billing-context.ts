import { AsyncLocalStorage } from "node:async_hooks";

// Request-local only: concurrent projects must never share the billing scope.
// Durable Object RPC does not carry async context, so Orchestrator stamps it
// explicitly on its private agent calls.
const billingScope = new AsyncLocalStorage<string>();
export function withBillingScope<T>(scope: string, work: () => T): T {
  return billingScope.run(scope, work);
}
export function currentBillingScope(): string | undefined {
  return billingScope.getStore();
}
export function projectBillingScope(projectId?: string): string {
  return projectId ? `project:${projectId}` : "global";
}
