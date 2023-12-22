import { APIAttachment } from 'discord-api-types/v10';
import OpenAI from 'openai';
import { getKVConfig } from './CloudflareHelpers';

export const isAttachmentValidForOpenAI = (attachment: APIAttachment) => {
  if (!attachment.content_type?.startsWith('image/')) {
    console.log('Invalid content type: ', attachment.content_type);
    return false;
  }

  const fileType = attachment.filename.split('.').pop()?.toLocaleLowerCase();
  const safeFileTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

  if (!safeFileTypes.includes(fileType ?? '')) {
    console.log('Invalid file type');
    return false;
  }

  if (attachment.size > 20 * 1024 * 1024) {
    console.log('File too large');
    return false;
  }

  return true;
};

export const getImageDescriptionFromOpenAI = async (url: string, env: Env, max_tokens: number = 500) => {
  const config = await getKVConfig(env);

  const openai = new OpenAI({
    apiKey: env.OPENAI_SECRET,
    baseURL: config.openAiEndpoint,
    maxRetries: 3,
    timeout: 15000,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: config.gptPrompt,
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

  console.log('GPT Description: ', completion.choices[0].message.content);

  return completion.choices[0].message.content;
};

export const generateImageFromOpenAI = async (description: string, env: Env, timeout: number = 45000) => {
  const config = await getKVConfig(env);

  const openai = new OpenAI({
    apiKey: env.OPENAI_SECRET,
    baseURL: config.openAiEndpoint,
    maxRetries: 3,
    timeout,
  });

  const generation = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `${config.dallePrompt} ${description}`,
    n: 1,
    size: '1024x1024',
    quality: 'hd',
    style: 'vivid',
    response_format: 'url',
  });

  console.log('DALL-E revised prompt: ', generation.data[0].revised_prompt);

  return generation.data[0];
};
