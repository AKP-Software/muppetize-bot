import type { ApplicationCommand } from './types.d.ts';

const registerCommands = async (env: Env, commands: Array<ApplicationCommand>, guildId?: string) => {
  const url = `https://discord.com/api/v10/applications/${env.APPLICATION_ID}/${guildId ? `guilds/${guildId}/commands` : 'commands'}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_SECRET}`,
    },
    method: 'PUT',
    body: JSON.stringify(commands),
  });

  if (response.ok) {
    return `Registered ${commands.length} command${commands.length !== 1 ? 's' : ''}!`;
  } else {
    const error = await response.text();
    return `Error registering commands: ${error}`;
  }
};

export { registerCommands };
