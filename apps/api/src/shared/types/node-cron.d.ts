declare module "node-cron" {
  interface ScheduledTask {
    start(): void;
    stop(): void;
  }

  function schedule(expression: string, func: () => void | Promise<void>): ScheduledTask;
  export default { schedule };
}
