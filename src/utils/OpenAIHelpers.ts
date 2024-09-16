import { APIAttachment } from 'discord-api-types/v10';
import OpenAI from 'openai';
import { getKVConfig } from './CloudflareHelpers';

export const isAttachmentValidForOpenAI = (attachment: APIAttachment, env: Env) => {
  if (!attachment.content_type?.startsWith('image/')) {
    env.logger.log('Invalid content type');
    return false;
  }

  const fileType = attachment.filename.split('.').pop()?.toLocaleLowerCase();
  const safeFileTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

  if (!safeFileTypes.includes(fileType ?? '')) {
    env.logger.log('Invalid file type');
    return false;
  }

  if (attachment.size > 20 * 1024 * 1024) {
    env.logger.log('File too large');
    return false;
  }

  return true;
};

export const getImageDescriptionFromOpenAI = async (url: string, env: Env, max_tokens: number = 500, typeOverride: string = 'a Muppet') => {
  const config = await getKVConfig(env);

  const openai = new OpenAI({
    apiKey: env.OPENAI_SECRET,
    baseURL: config.openAiEndpoint,
    maxRetries: 3,
    timeout: 15000,
  });

  const completion = await openai.chat.completions.create({
    model: config.openAiVisionModel,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: config.gptPrompt.replace('<type>', typeOverride),
          },
          {
            type: 'image_url',
            image_url: {
              url,
            },
          },
        ],
      },
    ],
    max_tokens,
  });

  env.logger.log(`GPT Description: ${completion.choices[0].message.content ?? ''}`);

  return completion.choices[0].message.content;
};

export const generateImageFromOpenAI = async (
  description: string,
  env: Env,
  timeout: number = 45000,
  typeOverride: string = 'a Muppet'
) => {
  const config = await getKVConfig(env);

  const openai = new OpenAI({
    apiKey: env.OPENAI_SECRET,
    baseURL: config.openAiEndpoint,
    maxRetries: 3,
    timeout,
  });

  const generation = await openai.images.generate({
    model: config.openAiDalleModel,
    prompt: `${config.dallePrompt.replace('<type>', typeOverride)} ${description}`,
    n: 1,
    size: '1024x1024',
    quality: 'hd',
    style: 'vivid',
    response_format: 'url',
  });

  env.logger.log(`DALL-E revised prompt: ${generation.data[0].revised_prompt ?? ''}`);

  return generation.data[0];
};
