import { APIDMChannel, APIInteraction } from 'discord-api-types/v10';
import { DiscordRequest } from './DiscordRequest';
import { BlobLike } from 'openai/uploads';

export const sendMessageToChannelWithAttachments = async (channelId: string, body: unknown, env: Env, imageBlobs: BlobLike[]) => {
  const formData = new FormData();
  formData.append('payload_json', JSON.stringify(body));

  imageBlobs.forEach((blob, index) => {
    // @ts-ignore - types technically mismatch here but it still works.
    formData.append(`files[${index}]`, blob, 'muppet.png');
  });

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_SECRET}`,
    },
    body: formData,
  });

  const json: any = await response.json();

  if (json.errors) {
    env.logger.setSeverity('error');
    env.logger.setExtraData('discordResponse', json);
    throw new Error('Error sending message to channel with attachments');
  }
};

export const respondToOriginalWithAttachments = async (interaction: APIInteraction, body: unknown, env: Env, imageBlobs: BlobLike[]) => {
  const formData = new FormData();
  formData.append('payload_json', JSON.stringify(body));

  imageBlobs.forEach((blob, index) => {
    // @ts-ignore - types technically mismatch here but it still works.
    formData.append(`files[${index}]`, blob, 'muppet.png');
  });

  const response = await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_SECRET}`,
    },
    body: formData,
  });

  const json: any = await response.json();

  if (json.errors) {
    env.logger.setSeverity('error');
    env.logger.setExtraData('discordResponse', json);
    throw new Error('Error responding to original with attachments');
  }
};

export const sendToDMWithAttachments = async (interaction: APIInteraction, body: unknown, env: Env, imageBlobs: BlobLike[]) => {
  const channelRequest = (await fetch(`https://discord.com/api/v10/users/@me/channels`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient_id: interaction.user?.id ?? interaction.member?.user?.id,
    }),
  }).then((res) => res.json())) as APIDMChannel;

  const channelId = channelRequest.id;

  const formData = new FormData();
  formData.append('payload_json', JSON.stringify(body));

  imageBlobs.forEach((blob, index) => {
    // @ts-ignore - types technically mismatch here but it still works.
    formData.append(`files[${index}]`, blob, 'muppet.png');
  });

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_SECRET}`,
    },
    body: formData,
  });

  const json: any = await response.json();

  if (json.errors) {
    env.logger.setSeverity('error');
    env.logger.setExtraData('discordResponse', json);
    env.logger.log('Error sending to DM with attachments');
    throw new Error('Error sending to DM with attachments');
  }
};
