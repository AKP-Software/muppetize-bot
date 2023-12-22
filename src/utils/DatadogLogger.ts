import { APIInteraction, APIUser } from 'discord-api-types/v10';

interface DatadogLogsMessage {
  request?: Request;
  response?: Response;
  interaction?: APIInteraction;
  queueParameters?: Omit<QueueMessage, 'interaction'>;
  env: Env;
}

interface DatadogLogsData {
  ddsource: string;
  ddtags: string;
  hostname: string;
  message: {
    timestamp: number;
    logs: Message[];
    interaction?: APIInteraction;
    queueParameters?: Omit<QueueMessage, 'interaction'>;
    user?: APIUser;
    http?: {
      method: string;
      url: string;
      headers: Record<string, string>;
      responseStatus: number;
    };
    cf?: Record<string, unknown>;
    extraData: Record<string, unknown>;
  };
}

interface Message {
  message: string;
  timestamp: number;
}

class Logger {
  private logs: Message[] = [];
  private extraData: Record<string, unknown> = {};

  public log(message: string) {
    console.log(message);
    this.logs.push({ message, timestamp: Date.now() });
  }

  public setExtraData(key: string, value: unknown) {
    this.extraData[key] = value;
  }

  public async sendLogsToDatadog({ request, response, interaction, env, queueParameters }: DatadogLogsMessage) {
    const apiKey = env.DATADOG_SECRET;
    const endpoint = 'https://http-intake.logs.datadoghq.com/api/v2/logs';
    const hostname = request != null ? request.headers.get('host') || 'unknown' : 'queue';

    // wait for a bit to let final logs settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const data: DatadogLogsData = {
      ddsource: 'cloudflare',
      ddtags: `service:cloudflare,source:cloudflare,worker:muppetize-bot,application_id:${env.APPLICATION_ID}`,
      hostname,
      message: {
        timestamp: Date.now(),
        logs: this.logs,
        interaction: Object.assign({}, interaction),
        user: Object.assign({}, interaction?.member?.user ?? interaction?.user ?? undefined),
        queueParameters,
        extraData: this.extraData,
      },
    };

    // don't log the token
    if (data.message.interaction != null) {
      data.message.interaction.token = '<REDACTED>';
    }

    if (request != null) {
      data.message.http = {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        responseStatus: response?.status ?? 0,
      };
      data.message.cf = request?.cf;
    }

    await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': apiKey,
      },
    });
  }
}

export default Logger;
