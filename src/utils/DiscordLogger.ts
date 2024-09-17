import { APIAttachment, APIEmbed, APIInteraction, InteractionType, RESTPostAPIChannelMessageJSONBody } from 'discord-api-types/v10';
import { getKVConfig } from './CloudflareHelpers';
import { downloadImage } from './GenericUtils';

export default class DiscordLogger {
  public static async log({
    interaction,
    env,
    imageBlobs,
    image,
    attachments,
  }: {
    interaction?: APIInteraction;
    env: Env;
    imageBlobs: Blob[];
    image: APIAttachment;
    attachments: APIAttachment[];
  }) {
    if (interaction?.type === InteractionType.ApplicationCommand) {
      const config = await getKVConfig(env);
      const endpoint = config.discordLoggerEndpoint;

      if (endpoint == null) return;

      const user = interaction.member?.user ?? interaction.user;
      const avatarHash = interaction.member?.user.avatar ?? interaction.user?.avatar;

      const avatarUrl = `https://cdn.discordapp.com/avatars/${user!.id}/${avatarHash}.png?size=1024`;

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
          url: 'attachment://image.png',
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

      const body: RESTPostAPIChannelMessageJSONBody = {
        attachments: [
          ...attachments.map((a, i) => ({ ...a, filename: `muppet${i}.png` })),
          {
            id: attachments[attachments.length - 1].id + 1,
            filename: 'image.png',
          },
        ],
        embeds: [embed],
      };

      const formData = new FormData();
      formData.append('payload_json', JSON.stringify(body));

      imageBlobs.forEach((blob, index) => {
        // @ts-ignore - types technically mismatch here but it still works.
        formData.append(`files[${index}]`, blob, `muppet${index}.png`);
      });

      // get image blob here and append to formData
      const imgBlob = await downloadImage(image.url);
      // @ts-ignore - types technically mismatch here but it still works.
      formData.append(`files[${imageBlobs.length}]`, imgBlob, 'image.png');

      await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
    }
  }
}
