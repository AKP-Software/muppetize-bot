import { APIApplicationCommand, APIApplicationCommandInteraction, APIAttachment } from 'discord-api-types/v10';

export declare type ApplicationCommand = Partial<APIApplicationCommand>;

export interface ComponentContext {
  user: APIUser;
}
declare global {
  interface QueueMessage {
    interaction: APIApplicationCommandInteraction;
    attachment: APIAttachment;
    target_id?: string;
    sendToDM?: boolean;
    user_id?: string;
  }
}
