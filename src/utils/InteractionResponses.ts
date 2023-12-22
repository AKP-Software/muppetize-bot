import {
  APIApplicationCommandInteraction,
  APIInteraction,
  APIInteractionResponse,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { DiscordRequest } from './DiscordRequest';

export const sendUpdate = async (interaction: APIApplicationCommandInteraction, env: Env, secondsGenerating: number, message: string) => {
  const ellipsis = ['.', '..', '...'][secondsGenerating % 3];
  env.logger.log('Sending update');
  await editOriginalResponse(
    interaction,
    {
      content: `${message}${ellipsis}`,
    },
    env
  );
};

export const errorResponse: APIInteractionResponse = {
  type: InteractionResponseType.ChannelMessageWithSource,
  data: {
    content: 'Error: something went wrong, try again later.',
    flags: MessageFlags.Ephemeral,
  },
};

export const deleteOriginalResponse = async (interaction: APIInteraction, env: Env) => {
  try {
    env.logger.log('Deleting original response');
    await DiscordRequest({
      endpoint: `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      options: {
        method: 'DELETE',
      },
      env,
    });
    env.logger.log('Deleted original response');
  } catch {
    env.logger.log('Error deleting original response');
  }
};

export const deleteFollowUp = async (interaction: APIInteraction, env: Env) => {
  try {
    env.logger.log('Deleting followup');
    await DiscordRequest({
      endpoint: `/webhooks/${interaction.application_id}/${interaction.token}/messages/${interaction.message!.id}`,
      options: {
        method: 'DELETE',
      },
      env,
    });
    env.logger.log('Deleted followup');
  } catch {
    env.logger.log('Error deleting followup');
  }
};

export const editOriginalResponse = async (interaction: APIInteraction, body: unknown, env: Env) => {
  try {
    env.logger.log('Editing original response');
    await DiscordRequest({
      endpoint: `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      options: {
        method: 'PATCH',
      },
      jsonBody: body,
      env,
    });
    env.logger.log('Edited original response');
  } catch {
    env.logger.log('Error editing original response');
  }
};

export const sendMessageToChannel = async (channelId: string, body: unknown, env: Env) => {
  env.logger.log('Sending message to channel');
  await DiscordRequest({
    endpoint: `/channels/${channelId}/messages`,
    options: {
      method: 'POST',
    },
    jsonBody: body,
    env,
  });
  env.logger.log('Sent message to channel');
};
