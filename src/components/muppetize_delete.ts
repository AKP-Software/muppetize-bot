import { APIInteractionResponse, APIMessageComponentInteraction } from 'discord-api-types/v10';
import { ButtonStyleTypes, MessageComponentTypes } from 'discord-interactions';
import { ComponentContext } from '../types';
import { deleteFollowUp, errorResponse } from '../utils/InteractionResponses';

const handler = async (
  interaction: APIMessageComponentInteraction,
  env: Env,
  _ctx: ExecutionContext
): Promise<APIInteractionResponse | void> => {
  const user = interaction.user ?? interaction.member?.user;
  const [_, userId] = interaction.data.custom_id.toLowerCase().split(':');

  if (!user) {
    return errorResponse;
  }

  if (user.id === userId) {
    await deleteFollowUp(interaction, env);
    return;
  }

  return;
};

export default {
  name: 'muppetize_delete',
  handler,
  sortIndex: 100,
  component: ({ user }: ComponentContext) => ({
    type: MessageComponentTypes.BUTTON,
    label: 'Delete',
    style: ButtonStyleTypes.DANGER,
    custom_id: `muppetize_delete:${user.id}`,
    emoji: {
      name: '🗑️',
    },
  }),
};
