import { APIApplicationCommandInteraction, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { APIInteractionResponse, APIAttachment, ApplicationCommandType } from 'discord-api-types/payloads/v10';
import { ApplicationCommand } from '../types';
import { getOptionValue, resolveOption } from '../utils/InteractionOptions';
import { isAttachmentValidForOpenAI } from '../utils/OpenAIHelpers';
import { editOriginalResponse } from '../utils/InteractionResponses';
import { enqueueMessage } from '../utils/CloudflareHelpers';

const MUPPETIZE_COMMAND: ApplicationCommand = {
  name: 'muppetize',
  type: ApplicationCommandType.ChatInput,
  description: 'Muppetize an image',
  default_member_permissions: '2048',
  contexts: [0, 1, 2],
  integration_types: [0, 1],
  options: [
    {
      name: 'image',
      type: ApplicationCommandOptionType.Attachment,
      description: 'image to muppetize',
      required: true,
    },
    {
      name: 'dm',
      type: ApplicationCommandOptionType.Boolean,
      description: 'whether to send the result via DM',
    },
    {
      name: 'silent',
      type: ApplicationCommandOptionType.Boolean,
      description: 'whether to send the result silently',
    },
  ],
} as ApplicationCommand; // jank lol

const muppetizeHandler = async (
  interaction: APIApplicationCommandInteraction,
  env: Env,
  _ctx: ExecutionContext
): Promise<APIInteractionResponse | void> => {
  env.logger.log('Muppetize command received');
  const attachment = resolveOption(interaction, 'image') as APIAttachment;
  const dm = getOptionValue(interaction, 'dm') as boolean;
  const silent = getOptionValue(interaction, 'silent') as boolean;
  env.logger.log('Muppetize command options:');
  env.logger.log(JSON.stringify({ attachment, dm, silent }));

  if (!isAttachmentValidForOpenAI(attachment, env)) {
    env.logger.log('Invalid attachment');
    env.logger.log('Muppetize command rejected');
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

  env.logger.log('Muppetize command accepted');
  await enqueueMessage({ interaction, attachment, sendToDM: dm, sendSilently: silent }, env);
};

export default {
  definition: MUPPETIZE_COMMAND,
  handler: muppetizeHandler,
};
