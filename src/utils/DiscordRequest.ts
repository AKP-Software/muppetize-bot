interface DiscordRequestOptions extends RequestInit {
  env: Env;
  endpoint: string;
  baseUrl?: string;
  options?: RequestInit;
  jsonBody?: unknown;
  formData?: string;
}

export const DiscordRequest = async <T = unknown>({
  baseUrl = 'https://discord.com/api/v10',
  endpoint,
  options = {},
  jsonBody,
  formData,
  env,
}: DiscordRequestOptions) => {
  if (jsonBody) {
    options.body = JSON.stringify(jsonBody);
  }
  if (formData) {
    options.body = formData;
  }
  const reqOptions = {
    ...options,
    headers: {
      Authorization: `Bot ${env.DISCORD_SECRET}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://akp.tools, 6.9.420)',
      ...options.headers,
    },
  };

  const res = await fetch(`${baseUrl}${endpoint}`, reqOptions);

  if (!res.ok) {
    const data = await res.json();
    env.logger.log(`call to ${endpoint} with options ${JSON.stringify(options)} resulted in status ${res.status}!`);
    throw new Error(JSON.stringify(data));
  }

  if (res.status === 204) {
    return;
  }

  try {
    // alright, so res.json() doesn't like taking a type param here, but if I don't have it then I have to change typing lots of other places instead.
    // moreover, this used to work and somehow recently broke so whatever.
    // @ts-ignore
    return await res.json<T>();
  } catch {
    return res;
  }
};
