import {
  APIApplicationCommandInteraction,
  APIAttachment,
  APIInteraction,
  APIStickerItem,
  APIUser,
  MessageFlags,
  StickerFormatType,
} from 'discord-api-types/v10';
import { getKVConfig } from './CloudflareHelpers';
import { deleteOriginalResponse, editOriginalResponse, sendUpdate } from './InteractionResponses';
import { generateImageFromOpenAI, getImageDescriptionFromOpenAI } from './OpenAIHelpers';
import { respondToOriginalWithAttachments, sendToDMWithAttachments } from './ResponseHelpers';
import { MessageComponentTypes } from 'discord-interactions';

import components from '../components';
import { APIUserWithStaffFlag } from '../types';

export const MUPPETIZE_COMPONENTS = components.filter((c) => c.name.startsWith('muppetize_')).sort((a, b) => a.sortIndex - b.sortIndex);

export const downloadImage = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Image download error');
  }

  return res.blob();
};

export const generateThumbnailUrl = (attachment: APIAttachment) => {
  if (attachment.width == null || attachment.height == null) {
    return null;
  }

  return `${attachment.proxy_url}format=webp`;
};

export const validateStickerAndGetUrl = (sticker: APIStickerItem) => {
  if (sticker.format_type === StickerFormatType.Lottie) {
    return null;
  }

  if (sticker.format_type === StickerFormatType.GIF) {
    return `https://cdn.discordapp.com/stickers/${sticker.id}.gif`;
  }

  return `https://cdn.discordapp.com/stickers/${sticker.id}.png`;
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

  const user = (interaction?.member?.user ?? interaction?.user) as unknown as APIUserWithStaffFlag;
  const guild = interaction?.guild_id;

  if (user.is_staff) {
    env.logger.log('User is staff');
    return true;
  }

  if (guild != null && config.guildAllowlist != null) {
    env.logger.log('Checking guild allowlist');
    if (config.guildAllowlist.includes(guild)) {
      env.logger.log('Guild is allowlisted');
      return true;
    }
  }

  if (config.userAllowlist != null && user != null) {
    env.logger.log('Checking user allowlist');
    if (config.userAllowlist.includes(user.id)) {
      env.logger.log('User is allowlisted');
      return true;
    }
  }

  env.logger.log('User is not allowlisted');
  return false;
};

export const isAdminUser = async (user: APIUser, env: Env) => {
  const config = await getKVConfig(env);
  if (config.adminUsers != null && user != null) {
    if (config.adminUsers.includes(user.id)) {
      return true;
    }
  }

  return false;
};

interface GetMuppetsAndRespondOptions {
  interaction: APIApplicationCommandInteraction;
  attachment: APIAttachment;
  env: Env;
  target_id?: string;
  sendToDM?: boolean;
  sendSilently?: boolean;
  user_id?: string;
}

export const getMuppetsAndRespond = async ({
  interaction,
  attachment,
  env,
  target_id,
  sendToDM,
  sendSilently,
  user_id,
}: GetMuppetsAndRespondOptions) => {
  let generating = true;
  let uploading = false;
  let seconds = 0;
  env.logger.log('Generating muppets');

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
    env.logger.log(`Generated ${images.length} muppets in ${seconds} seconds`);
    env.logger.setExtraData('imagesGenerated', images.length);
    env.logger.setExtraData('secondsToGenerate', seconds);
    seconds = 0;

    if (images.length === 0) {
      env.logger.log('No images generated');
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
    const flags = sendSilently ? MessageFlags.SuppressNotifications : undefined;

    if (sendToDM) {
      env.logger.log('Sending to DM');
      await sendToDMWithAttachments(
        interaction,
        {
          attachments,
          content,
          flags,
        },
        env,
        imageBlobs
      );
    } else {
      env.logger.log('Responding to original');
      await respondToOriginalWithAttachments(
        interaction,
        {
          attachments,
          content,
          flags,
          message_reference: { message_id: target_id },
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: MUPPETIZE_COMPONENTS.map((c) => c.component({ user: interaction.user ?? interaction.member!.user })),
            },
          ],
        },
        env,
        imageBlobs
      );
    }

    uploading = false;
    env.logger.log(`Uploaded images in ${seconds} seconds`);
    env.logger.setExtraData('secondsToUpload', seconds);

    env.logger.log('Deleting original response');
    await deleteOriginalResponse(interaction, env);
  } catch (e) {
    console.error('Error generating muppets', e);
    await editOriginalResponse(
      interaction,
      {
        content: 'Error: something went wrong, try again later.',
      },
      env
    );
  }
};
