import { APIApplicationCommandInteraction, APIAttachment, APIEmbed, RESTPostAPIChannelMessageJSONBody } from 'discord-api-types/v10';
import { getKVConfig } from './CloudflareHelpers';
import { downloadImage } from './GenericUtils';
import { getOptionValue } from './InteractionOptions';

export default class DiscordLogger {
  public static async log({
    interaction,
    env,
    imageBlobs,
    image,
    attachments,
  }: {
    interaction: APIApplicationCommandInteraction;
    env: Env;
    imageBlobs: Blob[];
    image: APIAttachment;
    attachments: APIAttachment[];
  }) {
    env.logger.log('Preparing to send logs to Discord');
    const config = await getKVConfig(env);
    const endpoint = config.discordLoggerEndpoint;

    if (endpoint == null) {
      env.logger.log('No discord logging endpoint set');
      return;
    }

    const user = interaction.member?.user ?? interaction.user;
    const avatarHash = interaction.member?.user.avatar ?? interaction.user?.avatar;

    const avatarUrl = `https://cdn.discordapp.com/avatars/${user!.id}/${avatarHash}.png?size=1024`;

    const shouldDownloadImage = image.url.startsWith('https://cdn.discordapp.com/ephemeral-attachments/');

    const embed: APIEmbed = {
      title: 'New muppetize-ation!',
      color: env.logger.getSeverity() === 'error' ? 0xff0000 : 0x00ff00,
      author: user
        ? {
            name: `@${user.username}`,
            icon_url: avatarUrl,
          }
        : undefined,
      image: {
        url: shouldDownloadImage ? 'attachment://image.png' : image.url,
      },
      fields: [
        {
          name: 'User',
          value: `<@${interaction.member!.user.id}>`,
          inline: true,
        },
        {
          name: 'Command',
          value: interaction.data.name,
          inline: true,
        },
        {
          name: 'Channel',
          value: `<#${interaction.channel.id}>`,
          inline: true,
        },
        {
          name: 'Guild ID',
          value: interaction.guild_id ?? 'DM',
          inline: true,
        },
        {
          name: 'Images Generated',
          value: `${attachments.length}`,
          inline: true,
        },
        {
          name: 'Generation Time',
          value: (env.logger.getExtraData('secondsToGenerate') as string) ?? 'Unknown',
          inline: true,
        },
        {
          name: 'Upload Time',
          value: (env.logger.getExtraData('secondsToUpload') as string) ?? 'Unknown',
          inline: true,
        },
      ],
    };

    if (interaction.data.name === 'muppetize') {
      const dm = getOptionValue(interaction, 'dm') as boolean;
      const silent = getOptionValue(interaction, 'silent') as boolean;
      const type = getOptionValue(interaction, 'type') as string;

      embed.fields?.push(
        {
          name: 'Type',
          value: type ?? 'Muppet',
          inline: true,
        },
        {
          name: 'DM',
          value: dm ? 'Yes' : 'No',
          inline: true,
        },
        {
          name: 'Silent',
          value: silent ? 'Yes' : 'No',
          inline: true,
        }
      );
    }

    const body: RESTPostAPIChannelMessageJSONBody = {
      attachments: attachments.map((a, i) => ({ ...a, filename: `muppet${i}.png` })),
      embeds: [embed],
    };

    if (shouldDownloadImage) {
      body.attachments?.push({
        id: attachments.length > 0 ? attachments[attachments.length - 1].id + 1 : 0,
        filename: 'image.png',
      });
    }

    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(body));

    imageBlobs.forEach((blob, index) => {
      // @ts-ignore - types technically mismatch here but it still works.
      formData.append(`files[${index}]`, blob, `muppet${index}.png`);
    });

    if (shouldDownloadImage) {
      const imgBlob = await downloadImage(image.url);
      // @ts-ignore - types technically mismatch here but it still works.
      formData.append(`files[${imageBlobs.length}]`, imgBlob, 'image.png');
    }

    env.logger.log('Sending logs to Discord');
    await fetch(endpoint, {
      method: 'POST',
      body: formData,
    }).then((r) => r.json());
  }
}
