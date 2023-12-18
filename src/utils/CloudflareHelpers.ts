export const enqueueMessage = async (message: QueueMessage, env: Env) => {
  // @ts-ignore - types don't match docs for some reason
  return env.MUPPETIZE_QUEUE.send(message, { contentType: 'json' });
};

export const getKVConfig = async (env: Env) => {
  const dallePrompt = (await env.CONFIG.get('DALL_E_PROMPT', 'text')) ?? '';
  const gptPrompt = (await env.CONFIG.get('GPT_PROMPT', 'text')) ?? '';
  const openAiEndpoint = await env.CONFIG.get('OPENAI_ENDPOINT', 'text');
  const userAllowlist = (await env.CONFIG.get('USER_ALLOWLIST', 'json')) as string[] | null;
  const guildAllowlist = (await env.CONFIG.get('GUILD_ALLOWLIST', 'json')) as string[] | null;

  return {
    dallePrompt,
    gptPrompt,
    openAiEndpoint,
    userAllowlist,
    guildAllowlist,
  };
};
