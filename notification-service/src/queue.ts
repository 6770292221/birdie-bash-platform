import { startNotificationConsumer } from "./consumers/notificationConsumer";

export async function bootQueue() {
  console.log("[bootQueue] starting consumer…");
  const start = async () => {
    try {
      await startNotificationConsumer();
      console.log("[bootQueue] consumer started");
      return true;
    } catch (e: any) {
      console.error("[bootQueue] start failed:", e?.code || e?.message || e);
      return false;
    }
  };
  if (!(await start())) {
    const ms = Number(process.env.CONSUMER_RETRY_MS || 5000);
    console.log(`[bootQueue] will retry every ${ms}ms`);
    const t = setInterval(async () => {
      if (await start()) clearInterval(t);
    }, ms);
  }
}
