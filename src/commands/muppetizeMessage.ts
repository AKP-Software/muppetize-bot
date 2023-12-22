import { APIApplicationCommandInteraction } from 'discord-api-types/v10';
import {
  APIInteractionResponse,
  ApplicationCommandType,
  APIMessageApplicationCommandInteractionDataResolved,
} from 'discord-api-types/payloads/v10';
import { ApplicationCommand } from '../types';
import { isContextMenuApplicationCommandInteraction } from 'discord-api-types/utils/v10';
import { editOriginalResponse, errorResponse } from '../utils/InteractionResponses';
import { isAttachmentValidForOpenAI } from '../utils/OpenAIHelpers';
import { enqueueMessage } from '../utils/CloudflareHelpers';
import { generateThumbnailUrl, isNotNull, validateStickerAndGetUrl } from '../utils/GenericUtils';

const MUPPETIZE_MESSAGE_COMMAND: ApplicationCommand = {
  name: 'Muppetize',
  type: ApplicationCommandType.Message,
  default_member_permissions: '2048',
  contexts: [0, 1, 2],
  integration_types: [0, 1],
} as ApplicationCommand; // jank lol

const MUPPETIZE_MESSAGE_DM_COMMAND: ApplicationCommand = {
  name: 'Muppetize to DM',
  type: ApplicationCommandType.Message,
  default_member_permissions: '2048',
  contexts: [0, 1, 2],
  integration_types: [0, 1],
} as ApplicationCommand; // jank lol

const MUPPETIZE_MESSAGE_SILENT_COMMAND: ApplicationCommand = {
  name: 'Muppetize Silently',
  type: ApplicationCommandType.Message,
  default_member_permissions: '2048',
  contexts: [0, 1, 2],
  integration_types: [0, 1],
} as ApplicationCommand; // jank lol

const muppetizeMessageHandler = async (
  interaction: APIApplicationCommandInteraction,
  env: Env,
  _ctx: ExecutionContext
): Promise<APIInteractionResponse | void> => {
  env.logger.log('Muppetize message command received');
  if (!isContextMenuApplicationCommandInteraction(interaction)) {
    env.logger.log('Invalid interaction type');
    return errorResponse;
  }

  let sendToDM = false;
  let sendSilently = false;

  if (interaction.data.name === 'Muppetize to DM') {
    env.logger.log('Muppetize to DM command received');
    sendToDM = true;
  }

  if (interaction.data.name === 'Muppetize Silently') {
    env.logger.log('Muppetize Silently command received');
    sendSilently = true;
  }

  const targetMessage = interaction.data.target_id;
  const resolvedMessage = (interaction.data.resolved as APIMessageApplicationCommandInteractionDataResolved).messages[targetMessage];
  const validImageAttachments = resolvedMessage.attachments?.filter((attachment) => isAttachmentValidForOpenAI(attachment, env));
  const validImageAttachmentThumbnails = resolvedMessage.attachments
    ?.map((attachment) => generateThumbnailUrl(attachment))
    .filter(isNotNull)
    .map((url) => ({ url }));
  const validImageEmbeds = resolvedMessage.embeds?.filter((embed) => embed.type === 'image').map((embed) => ({ url: embed.url }));
  const validOtherEmbeds = resolvedMessage.embeds
    ?.filter((embed) => embed.thumbnail != null)
    .map((embed) => ({ url: embed.thumbnail?.url }));
  const validStickers =
    resolvedMessage.sticker_items
      ?.map(validateStickerAndGetUrl)
      .filter(isNotNull)
      .map((url) => ({ url })) ?? [];

  const attachment =
    validImageAttachments[0] ?? validImageAttachmentThumbnails[0] ?? validImageEmbeds[0] ?? validOtherEmbeds[0] ?? validStickers[0] ?? null;

  if (!attachment) {
    env.logger.log('No valid attachment found');
    await editOriginalResponse(
      interaction,
      {
        content:
          "Error: That message doesn't contain a valid image! Please make sure your image is below 20 MB in size and is of one the following formats: ['png', 'jpeg', 'gif', 'webp'].",
      },
      env
    );
    return;
  }

  await editOriginalResponse(
    interaction,
    {
      content: `Waiting for generation to begin...`,
    },
    env
  );

  env.logger.log('Muppetize message command accepted');
  await enqueueMessage({ interaction, attachment, target_id: targetMessage, sendToDM, sendSilently }, env);
};

export default [
  {
    definition: MUPPETIZE_MESSAGE_COMMAND,
    handler: muppetizeMessageHandler,
  },
  {
    definition: MUPPETIZE_MESSAGE_DM_COMMAND,
    handler: muppetizeMessageHandler,
  },
  {
    definition: MUPPETIZE_MESSAGE_SILENT_COMMAND,
    handler: muppetizeMessageHandler,
  },
];
