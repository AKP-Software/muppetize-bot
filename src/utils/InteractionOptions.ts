import { isChatInputApplicationCommandInteraction } from 'discord-api-types/utils/v10';
import {
  APIApplicationCommandInteraction,
  APIApplicationCommandInteractionDataBasicOption,
  APIApplicationCommandInteractionDataOption,
  APIInteractionDataResolved,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10';

export const isOptionBasic = (
  option: APIApplicationCommandInteractionDataOption
): option is APIApplicationCommandInteractionDataBasicOption => {
  return option.type !== ApplicationCommandOptionType.Subcommand && option.type !== ApplicationCommandOptionType.SubcommandGroup;
};

export const getOption = (interaction: APIApplicationCommandInteraction, optionName: string) => {
  if (isChatInputApplicationCommandInteraction(interaction)) {
    const option = (interaction.data.options ?? []).find((o) => o.name === optionName);
    if (option != null && isOptionBasic(option)) {
      return option;
    }
  }
};

export const getOptionValue = (interaction: APIApplicationCommandInteraction, optionName: string) => {
  const option = getOption(interaction, optionName);
  if (option != null) {
    return option.value;
  }
};

export const resolveOption = (interaction: APIApplicationCommandInteraction, optionName: string) => {
  const option = getOption(interaction, optionName);
  const resolved = interaction.data.resolved as APIInteractionDataResolved;

  if (option != null) {
    switch (option.type) {
      case ApplicationCommandOptionType.Attachment:
        return resolved?.attachments?.[option.value] ?? null;
      case ApplicationCommandOptionType.Channel:
        return resolved?.channels?.[option.value] ?? null;
      case ApplicationCommandOptionType.Mentionable:
        return resolved?.members?.[option.value] ?? resolved?.users?.[option.value] ?? resolved?.roles?.[option.value] ?? null;
      case ApplicationCommandOptionType.Role:
        return resolved?.roles?.[option.value] ?? null;
      case ApplicationCommandOptionType.User:
        return resolved?.users?.[option.value] ?? resolved?.members?.[option.value] ?? null;
      default:
        return null;
    }
  }

  return null;
};
