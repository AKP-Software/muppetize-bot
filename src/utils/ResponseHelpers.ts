import { APIDMChannel, APIInteraction } from 'discord-api-types/v10';
import { DiscordRequest } from './DiscordRequest';
import { BlobLike } from 'openai/uploads';

export const sendMessageToChannelWithAttachments = async (channelId: string, body: unknown, env: Env, imageBlobs: BlobLike[]) => {
  try {
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

export const respondToOriginalWithAttachments = async (interaction: APIInteraction, body: unknown, env: Env, imageBlobs: BlobLike[]) => {
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

export const sendToDMWithAttachments = async (interaction: APIInteraction, body: unknown, env: Env, imageBlobs: BlobLike[]) => {
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
