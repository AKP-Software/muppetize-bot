declare interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
  // MY_QUEUE: Queue;

  MUPPETIZE_QUEUE: Queue<QueueMessage>;
  CONFIG: KVNamespace;

  APPLICATION_ID: string;
  PUBLIC_KEY: string;
  TEST_GUILD_ID: string;
  DISCORD_SECRET: string;
  DATADOG_SECRET: string;
  OPENAI_SECRET: string;
  OPENAI_ENDPOINT: string;
  GPT_VISION_PROMPT: string;
  DALL_E_PROMPT: string;
  ENVIRONMENT: 'production' | 'development';

  logger: {
    log: (message: string) => void;
    setExtraData: (key: string, value: unknown) => void;
    sendLogsToDatadog: (message: DatadogLogsMessage) => Promise<void>;
  };
}
