import { Router } from 'itty-router';
import { verifyKey } from 'discord-interactions';
import commands from './commands';
import components from './components';
import { registerCommands } from './registerCommands';
import { APIInteraction } from 'discord-api-types/v10';
import { InteractionType, InteractionResponseType, MessageFlags, ApplicationCommandType } from 'discord-api-types/payloads/v10';
import { JsonResponse } from './utils/JsonResponse';
import { getMuppetsAndRespond, isUserAllowed } from './utils/GenericUtils';

const router = Router();
const notFoundResponse = () => new Response('Not Found.', { status: 404 });

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (_request, _env: Env) => {
  return new Response(`👋`);
});

router.get('/_internal/setup', async (_request, env: Env) => {
  if (env.ENVIRONMENT !== 'development') {
    return;
  }

  const commandDefinitions = commands.map((command) => command.definition);
  const localizedCommandDefinitions = commandDefinitions.map((definition) => ({
    ...definition,
    name: definition.type === ApplicationCommandType.ChatInput ? definition.name + '_dev' : definition.name + ' (dev)',
  }));
  const result = await registerCommands(env, localizedCommandDefinitions, env.TEST_GUILD_ID);
  return new Response(result);
});

router.get('/_internal/cleanup', async (_request, env: Env) => {
  if (env.ENVIRONMENT !== 'development') {
    return;
  }

  const result = await registerCommands(env, [], env.TEST_GUILD_ID);
  return new Response(result);
});

router.get('/_internal/setupGlobal', async (_request, env: Env) => {
  if (env.ENVIRONMENT !== 'development') {
    return;
  }
  const commandDefinitions = commands.map((command) => command.definition);
  const result = await registerCommands(env, commandDefinitions);
  return new Response(result);
});

router.get('/_internal/cleanupGlobal', async (_request, env: Env) => {
  if (env.ENVIRONMENT !== 'development') {
    return;
  }

  const result = await registerCommands(env, []);
  return new Response(result);
});

router.get('/invite', async (_request, env: Env) => {
  return new Response('', {
    headers: {
      Location: `https://discord.com/api/oauth2/authorize?client_id=${env.APPLICATION_ID}&permissions=515463498816&scope=bot%20applications.commands`,
    },
    status: 301,
  });
});

router.get('/inviteUserApp', async (_request, env: Env) => {
  return new Response(
    `https://discord.com/api/oauth2/authorize?client_id=${env.APPLICATION_ID}&scope=applications.commands&integration_type=1`
  );
});

router.post('/interaction', async (request, env: Env, ctx: ExecutionContext) => {
  const message = (await request.json()) as APIInteraction;

  if (message.type === InteractionType.Ping) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.Pong,
    });
  }

  if (message.type === InteractionType.ApplicationCommand) {
    const cmdName = message.data.name.replace('_testing', '');
    const cmdType = message.data.type;
    if (!cmdName || !cmdType) {
      return notFoundResponse();
    }

    const handler = (commands.find((cmd) => cmd.definition.name === cmdName && cmd.definition.type === cmdType) ?? {}).handler;

    if (!handler) {
      return notFoundResponse();
    }

    const user = message?.member?.user ?? message?.user;

    if (user == null || !isUserAllowed(user, env)) {
      return new JsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'You are not allowed to use this command.', flags: MessageFlags.Ephemeral },
      });
    }

    ctx.waitUntil(handler(message, env, ctx));

    return new JsonResponse({
      type: InteractionResponseType.DeferredChannelMessageWithSource,
      data: { content: 'Warming up...', flags: MessageFlags.Ephemeral },
    });
  }

  if (message.type === InteractionType.MessageComponent) {
    const [componentName] = message.data.custom_id.toLowerCase().split(':');

    if (!componentName) {
      return notFoundResponse();
    }

    const handler = (components.find((component) => component.name === componentName) ?? {}).handler;

    if (!handler) {
      return notFoundResponse();
    }

    ctx.waitUntil(handler(message, env, ctx));

    return new JsonResponse({
      type: InteractionResponseType.DeferredMessageUpdate,
      data: { flags: MessageFlags.Ephemeral, content: 'Warming up...' },
    });
  }
});

router.all('*', notFoundResponse);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'POST') {
      // Using the incoming headers, verify this request actually came from discord.
      const signature = request.headers.get('x-signature-ed25519') ?? '';
      const timestamp = request.headers.get('x-signature-timestamp') ?? '';
      const body = await request.clone().arrayBuffer();
      const isValidRequest = verifyKey(body, signature, timestamp, env.PUBLIC_KEY);
      if (!isValidRequest) {
        console.error('Invalid Request');
        return new Response('Bad request signature.', { status: 401 });
      }
    }

    return router.handle(request, env, ctx);
  },
  async queue(batch: MessageBatch<QueueMessage>, env: Env, _ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      try {
        await getMuppetsAndRespond({ ...message.body, env });
        message.ack();
      } catch {
        message.retry();
      }
    }
  },
};