import { APIApplicationCommand, APIApplicationCommandInteraction, APIAttachment, APIUser } from 'discord-api-types/v10';

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
    sendSilently?: boolean;
    user_id?: string;
  }
}

export interface APIUserWithStaffFlag extends APIUser {
  is_staff: boolean;
}
