import { APIApplicationCommandInteraction, APIAttachment, APIInteraction, APIUser } from 'discord-api-types/v10';
import { getKVConfig } from './CloudflareHelpers';
import { deleteOriginalResponse, editOriginalResponse, sendUpdate } from './InteractionResponses';
import { generateImageFromOpenAI, getImageDescriptionFromOpenAI } from './OpenAIHelpers';
import { respondToOriginalWithAttachments, sendToDMWithAttachments } from './ResponseHelpers';
import { MessageComponentTypes } from 'discord-interactions';

import components from '../components';

export const MUPPETIZE_COMPONENTS = components.filter((c) => c.name.startsWith('muppetize_')).sort((a, b) => a.sortIndex - b.sortIndex);

export const downloadImage = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Image download error');
  }

  return res.blob();
};

export const isNotNull = <T>(value: T | null): value is T => value != null;
export const filterResolvedPromises = <T>(resolved: PromiseSettledResult<T>[]): (T | null)[] =>
  resolved.map((res) => (res.status === 'fulfilled' ? res.value : null));

export const truncatePrompt = (prompt?: string, length: number = 1024) => {
  if (prompt == null) {
    return null;
  }

  if (prompt.length > length) {
    return prompt.substring(0, length - 3) + '...';
  }

  return prompt;
};

export const isUserAllowed = async (interaction: APIInteraction, env: Env) => {
  const config = await getKVConfig(env);

  const user = interaction?.member?.user ?? interaction?.user;
  const guild = interaction?.guild_id;

  if (user == null) {
    return false;
  }

  if ((user.flags ?? user.public_flags ?? 0) & (1 << 0)) {
    return true;
  }

  if (guild != null && config.guildAllowlist != null) {
    if (config.guildAllowlist.includes(guild)) {
      return true;
    }
  }

  if (config.userAllowlist == null) {
    return false;
  }

  return config.userAllowlist.includes(user.id);
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

    const imageBlobs = await Promise.all(images.map((image) => downloadImage(image.url as string)));

    if (sendToDM) {
      await sendToDMWithAttachments(
        interaction,
        {
          attachments,
          content,
        },
        env,
        imageBlobs
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
        imageBlobs
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
