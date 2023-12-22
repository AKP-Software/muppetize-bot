import { APIApplicationCommandInteraction } from 'discord-api-types/v10';
import {
  APIInteractionResponse,
  ApplicationCommandType,
  APIUserInteractionDataResolved,
  APIAttachment,
} from 'discord-api-types/payloads/v10';
import { ApplicationCommand } from '../types';
import { isContextMenuApplicationCommandInteraction } from 'discord-api-types/utils/v10';
import { editOriginalResponse, errorResponse } from '../utils/InteractionResponses';
import { enqueueMessage } from '../utils/CloudflareHelpers';

const MUPPETIZE_USER_COMMAND: ApplicationCommand = {
  name: 'Muppetize',
  type: ApplicationCommandType.User,
  default_member_permissions: '2048',
  contexts: [0, 1, 2],
  integration_types: [0, 1],
} as ApplicationCommand; // jank lol

const MUPPETIZE_USER_DM_COMMAND: ApplicationCommand = {
  name: 'Muppetize to DM',
  type: ApplicationCommandType.User,
  default_member_permissions: '2048',
  contexts: [0, 1, 2],
  integration_types: [0, 1],
} as ApplicationCommand; // jank lol

const MUPPETIZE_USER_SILENT_COMMAND: ApplicationCommand = {
  name: 'Muppetize Silently',
  type: ApplicationCommandType.User,
  default_member_permissions: '2048',
  contexts: [0, 1, 2],
  integration_types: [0, 1],
} as ApplicationCommand; // jank lol

const muppetizeUserHandler = async (
  interaction: APIApplicationCommandInteraction,
  env: Env,
  _ctx: ExecutionContext
): Promise<APIInteractionResponse | void> => {
  if (!isContextMenuApplicationCommandInteraction(interaction)) {
    return errorResponse;
  }

  let sendToDM = false;
  let sendSilently = false;

  if (interaction.data.name === 'Muppetize to DM') {
    sendToDM = true;
  }

  if (interaction.data.name === 'Muppetize Silently') {
    sendSilently = true;
  }

  const targetUser = interaction.data.target_id;
  const resolvedUser = (interaction.data.resolved as APIUserInteractionDataResolved).users[targetUser];
  const resolvedMember = (interaction.data.resolved as APIUserInteractionDataResolved).members?.[targetUser];

  const avatarHash = resolvedMember?.avatar ?? resolvedUser.avatar;

  if (avatarHash == null) {
    console.log('User has no avatar: ', targetUser);
    await editOriginalResponse(
      interaction,
      {
        content: `Error: That user doesn't have an avatar!`,
      },
      env
    );
    return;
  }

  const avatarUrl = resolvedMember?.avatar
    ? `https://cdn.discordapp.com/guilds/${interaction.guild_id}/users/${targetUser}/avatars/${avatarHash}.png`
    : `https://cdn.discordapp.com/avatars/${targetUser}/${avatarHash}.png?size=1024`;

  await editOriginalResponse(
    interaction,
    {
      content: `Waiting for generation to begin...`,
    },
    env
  );

  await enqueueMessage({ interaction, attachment: { url: avatarUrl } as APIAttachment, user_id: targetUser, sendToDM, sendSilently }, env);
};

export default [
  {
    definition: MUPPETIZE_USER_COMMAND,
    handler: muppetizeUserHandler,
  },
  {
    definition: MUPPETIZE_USER_DM_COMMAND,
    handler: muppetizeUserHandler,
  },
  {
    definition: MUPPETIZE_USER_SILENT_COMMAND,
    handler: muppetizeUserHandler,
  },
];
