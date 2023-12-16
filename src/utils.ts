import { isChatInputApplicationCommandInteraction } from 'discord-api-types/utils/v10';
import {
  APIApplicationCommandInteraction,
  APIApplicationCommandInteractionDataBasicOption,
  APIApplicationCommandInteractionDataOption,
  APIAttachment,
  APIDMChannel,
  APIInteraction,
  APIInteractionDataResolved,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { MessageComponentTypes } from 'discord-interactions';
import OpenAI from 'openai';

import components from './components';

export const MUPPETIZE_COMPONENTS = components.filter((c) => c.name.startsWith('muppetize_')).sort((a, b) => a.sortIndex - b.sortIndex);

export class JsonResponse extends Response {
  constructor(body: unknown, init?: ResponseInit) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    };
    super(jsonBody, init);
  }
}

export const isOptionBasic = (
  option: APIApplicationCommandInteractionDataOption
): option is APIApplicationCommandInteractionDataBasicOption => {
  return option.type !== ApplicationCommandOptionType.Subcommand && option.type !== ApplicationCommandOptionType.SubcommandGroup;
};

export const getOption = (interaction: APIApplicationCommandInteraction, optionName: string) => {
  if (isChatInputApplicationCommandInteraction(interaction)) {
    const option = (interaction.data.options ?? []).find((o) => o.name === optionName);
    if (option != null && isOptionBasic(option)) {
      return option;
    }
  }
};

export const getOptionValue = (interaction: APIApplicationCommandInteraction, optionName: string) => {
  const option = getOption(interaction, optionName);
  if (option != null) {
    return option.value;
  }
};

export const resolveOption = (interaction: APIApplicationCommandInteraction, optionName: string) => {
  const option = getOption(interaction, optionName);
  const resolved = interaction.data.resolved as APIInteractionDataResolved;

  if (option != null) {
    switch (option.type) {
      case ApplicationCommandOptionType.Attachment:
        return resolved?.attachments?.[option.value] ?? null;
      case ApplicationCommandOptionType.Channel:
        return resolved?.channels?.[option.value] ?? null;
      case ApplicationCommandOptionType.Mentionable:
        return resolved?.members?.[option.value] ?? resolved?.users?.[option.value] ?? resolved?.roles?.[option.value] ?? null;
      case ApplicationCommandOptionType.Role:
        return resolved?.roles?.[option.value] ?? null;
      case ApplicationCommandOptionType.User:
        return resolved?.users?.[option.value] ?? resolved?.members?.[option.value] ?? null;
      default:
        return null;
    }
  }

  return null;
};

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
    console.error(`call to ${endpoint} with options ${JSON.stringify(options)} resulted in status ${res.status}!`);
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

export const deleteOriginalResponse = async (interaction: APIInteraction, env: Env) => {
  try {
    await DiscordRequest({
      endpoint: `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      options: {
        method: 'DELETE',
      },
      env,
    });
  } catch {
    // ignore, probably expired interaction token
  }
};

export const deleteFollowUp = async (interaction: APIInteraction, env: Env) => {
  try {
    await DiscordRequest({
      endpoint: `/webhooks/${interaction.application_id}/${interaction.token}/messages/${interaction.message!.id}`,
      options: {
        method: 'DELETE',
      },
      env,
    });
  } catch {
    // ignore, probably expired interaction token
  }
};

export const editOriginalResponse = async (interaction: APIInteraction, body: unknown, env: Env) => {
  try {
    await DiscordRequest({
      endpoint: `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      options: {
        method: 'PATCH',
      },
      jsonBody: body,
      env,
    });
  } catch {
    // ignore, probably expired interaction token
  }
};

export const sendMessageToChannel = async (channelId: string, body: unknown, env: Env) => {
  await DiscordRequest({
    endpoint: `/channels/${channelId}/messages`,
    options: {
      method: 'POST',
    },
    jsonBody: body,
    env,
  });
};

export const sendMessageToChannelWithAttachments = async (channelId: string, body: unknown, env: Env, attachments: string[]) => {
  try {
    const imageBlobs = await Promise.all(attachments.map((url) => downloadImage(url)));
    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(body));

    imageBlobs.forEach((blob, index) => {
      // @ts-ignore - types technically mismatch here but it still works.
      formData.append(`files[${index}]`, blob, 'muppet.png');
    });

    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${env.DISCORD_SECRET}`,
      },
      body: formData,
    });
  } catch (e) {
    console.error(e);
  }
};

export const respondToOriginalWithAttachments = async (interaction: APIInteraction, body: unknown, env: Env, attachments: string[]) => {
  const imageBlobs = await Promise.all(attachments.map((url) => downloadImage(url)));
  const formData = new FormData();
  formData.append('payload_json', JSON.stringify(body));

  imageBlobs.forEach((blob, index) => {
    // @ts-ignore - types technically mismatch here but it still works.
    formData.append(`files[${index}]`, blob, 'muppet.png');
  });

  await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_SECRET}`,
    },
    body: formData,
  });
};

export const sendToDMWithAttachments = async (interaction: APIInteraction, body: unknown, env: Env, attachments: string[]) => {
  const channelRequest = (await DiscordRequest<APIDMChannel>({
    endpoint: `/users/@me/channels`,
    options: {
      method: 'POST',
    },
    jsonBody: {
      recipient_id: interaction.user?.id ?? interaction.member?.user?.id,
    },
    env,
  })) as APIDMChannel;

  const channelId = channelRequest.id;

  const imageBlobs = await Promise.all(attachments.map((url) => downloadImage(url)));
  const formData = new FormData();
  formData.append('payload_json', JSON.stringify(body));

  imageBlobs.forEach((blob, index) => {
    // @ts-ignore - types technically mismatch here but it still works.
    formData.append(`files[${index}]`, blob, 'muppet.png');
  });

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_SECRET}`,
    },
    body: formData,
  });
};

export const errorResponse: APIInteractionResponse = {
  type: InteractionResponseType.ChannelMessageWithSource,
  data: {
    content: 'Error: something went wrong, try again later.',
    flags: MessageFlags.Ephemeral,
  },
};

export const isAttachmentValidForOpenAI = (attachment: APIAttachment) => {
  if (!attachment.content_type?.startsWith('image/')) {
    return false;
  }

  const fileType = attachment.filename.split('.').pop()?.toLocaleLowerCase();
  const safeFileTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

  if (!safeFileTypes.includes(fileType ?? '')) {
    return false;
  }

  if (attachment.size > 20 * 1024 * 1024) {
    return false;
  }

  return true;
};

export const getKVConfig = async (env: Env) => {
  const dallePrompt = (await env.CONFIG.get('DALL_E_PROMPT', 'text')) ?? '';
  const gptPrompt = (await env.CONFIG.get('GPT_PROMPT', 'text')) ?? '';
  const openAiEndpoint = await env.CONFIG.get('OPENAI_ENDPOINT', 'text');

  return {
    dallePrompt,
    gptPrompt,
    openAiEndpoint,
  };
};

export const getImageDescriptionFromOpenAI = async (url: string, env: Env, max_tokens: number = 500) => {
  const config = await getKVConfig(env);

  const openai = new OpenAI({
    apiKey: env.OPENAI_SECRET,
    baseURL: config.openAiEndpoint,
    maxRetries: 3,
    timeout: 15000,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: config.gptPrompt,
          },
          {
            type: 'image_url',
            image_url: {
              url,
            },
          },
        ],
      },
    ],
    max_tokens,
  });

  return completion.choices[0].message.content;
};

export const generateImageFromOpenAI = async (description: string, env: Env, timeout: number = 45000) => {
  const config = await getKVConfig(env);

  const openai = new OpenAI({
    apiKey: env.OPENAI_SECRET,
    baseURL: config.openAiEndpoint,
    maxRetries: 3,
    timeout,
  });

  const generation = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `${config.dallePrompt} ${description}`,
    n: 1,
    size: '1024x1024',
    quality: 'hd',
    style: 'vivid',
    response_format: 'url',
  });

  return generation.data[0];
};

export const downloadImage = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Image download error');
  }

  return res.blob();
};

const isNotNull = <T>(value: T | null): value is T => value != null;
const filterResolvedPromises = <T>(resolved: PromiseSettledResult<T>[]): (T | null)[] =>
  resolved.map((res) => (res.status === 'fulfilled' ? res.value : null));

export const enqueueMessage = async (message: QueueMessage, env: Env) => {
  // @ts-ignore - types don't match docs for some reason
  return env.MUPPETIZE_QUEUE.send(message, { contentType: 'json' });
};

const truncatePrompt = (prompt?: string, length: number = 1024) => {
  if (prompt == null) {
    return null;
  }

  if (prompt.length > length) {
    return prompt.substring(0, length - 3) + '...';
  }

  return prompt;
};

interface GetMuppetsAndRespondOptions {
  interaction: APIApplicationCommandInteraction;
  attachment: APIAttachment;
  env: Env;
  target_id?: string;
  sendToDM?: boolean;
  user_id?: string;
}

export const getMuppetsAndRespond = async ({ interaction, attachment, env, target_id, sendToDM, user_id }: GetMuppetsAndRespondOptions) => {
  let generating = true;
  let uploading = false;
  let seconds = 0;

  const updateInterval = setInterval(async () => {
    if (generating) {
      if (seconds > 25) {
        await sendUpdate(interaction, env, seconds, 'Generating muppets is taking a while');
      } else {
        const time = 25 - seconds;
        await sendUpdate(interaction, env, seconds, `Generating muppets. Estimated time remaining: ${time} second${time === 1 ? '' : 's'}`);
      }
      seconds += 1;
      return;
    }

    if (uploading) {
      await sendUpdate(interaction, env, seconds, 'Uploading images');
      seconds += 1;
      return;
    }

    clearInterval(updateInterval);
    return;
  }, 1000);

  try {
    const descriptions = filterResolvedPromises(
      await Promise.allSettled([
        getImageDescriptionFromOpenAI(attachment.url, env, 500),
        getImageDescriptionFromOpenAI(attachment.url, env, 501),
      ])
    ).filter(isNotNull);
    const images = filterResolvedPromises(
      await Promise.allSettled(descriptions.map((desc) => generateImageFromOpenAI(desc as string, env)))
    ).filter(isNotNull);
    generating = false;
    uploading = true;

    if (images.length === 0) {
      throw new Error('No images generated');
    }

    const attachments = images.map((image, index) => ({
      id: index,
      description: truncatePrompt(image.revised_prompt),
      filename: 'muppet.png',
    }));

    const member = interaction?.user?.id ?? interaction.member?.user?.id;

    let content = '';

    if (member) {
      content = `<@${member}>, your muppet(s) have arrived!`;
    }

    if (target_id && interaction.guild_id) {
      content = `Generated from this message: https://discord.com/channels/${interaction.guild_id}/${interaction.channel.id}/${target_id}`;
    }

    if (target_id && interaction.guild_id == null) {
      content = `Generated from this message: https://discord.com/channels/@me/${interaction.channel.id}/${target_id}`;
    }

    if (user_id) {
      content = `Generated from this user: <@${user_id}>`;
      if (interaction.guild_id) {
        content += ` from <#${interaction.channel.id}>`;
      }
    }

    if (sendToDM) {
      await sendToDMWithAttachments(
        interaction,
        {
          attachments,
          content,
        },
        env,
        images.map((image) => image.url as string)
      );
    } else {
      await respondToOriginalWithAttachments(
        interaction,
        {
          attachments,
          content,
          message_reference: { message_id: target_id },
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: MUPPETIZE_COMPONENTS.map((c) => c.component({ user: interaction.user ?? interaction.member?.user })),
            },
          ],
        },
        env,
        images.map((image) => image.url as string)
      );
    }

    uploading = false;

    await deleteOriginalResponse(interaction, env);
  } catch {
    await editOriginalResponse(
      interaction,
      {
        content: 'Error: something went wrong, try again later.',
      },
      env
    );
  }
};

const sendUpdate = async (interaction: APIApplicationCommandInteraction, env: Env, secondsGenerating: number, message: string) => {
  const ellipsis = ['.', '..', '...'][secondsGenerating % 3];
  await editOriginalResponse(
    interaction,
    {
      content: `${message}${ellipsis}`,
    },
    env
  );
};
