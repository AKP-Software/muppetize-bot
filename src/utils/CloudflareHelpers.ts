export const enqueueMessage = async (message: QueueMessage, env: Env) => {
  env.logger.log('Enqueuing message');

  // @ts-ignore - types don't match docs for some reason
  return env.MUPPETIZE_QUEUE.send(message, { contentType: 'json' });
};

export const getKVConfig = async (env: Env) => {
  const adminUsers = (await env.CONFIG.get('ADMIN_USERS', 'json')) as string[] | null;
  const dallePrompt = (await env.CONFIG.get('DALL_E_PROMPT', 'text')) ?? '';
  const gptPrompt = (await env.CONFIG.get('GPT_PROMPT', 'text')) ?? '';
  const openAiEndpoint = await env.CONFIG.get('OPENAI_ENDPOINT', 'text');
  const openAiVisionModel = (await env.CONFIG.get('OPENAI_VISION_MODEL', 'text')) ?? 'gpt-4o';
  const openAiDalleModel = (await env.CONFIG.get('OPENAI_DALLE_MODEL', 'text')) ?? 'dall-e-3';
  const userAllowlist = (await env.CONFIG.get('USER_ALLOWLIST', 'json')) as string[] | null;
  const guildAllowlist = (await env.CONFIG.get('GUILD_ALLOWLIST', 'json')) as string[] | null;

  return {
    adminUsers,
    dallePrompt,
    gptPrompt,
    openAiEndpoint,
    openAiVisionModel,
    openAiDalleModel,
    userAllowlist,
    guildAllowlist,
  };
};
