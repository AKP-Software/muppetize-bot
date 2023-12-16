# Muppetize

It's a bot that turns people into muppets or something. It runs in a Cloudflare Worker.

## Setup

This project uses pnpm, so just `pnpm i` to install all the dependencies. You'll probably have to change a bunch of
stuff in `wrangler.toml`. You'll also want to get a Discord bot token and an OpenAI API key, and use Wrangler to put
those into Cloudflare Worker secrets named `DISCORD_SECRET` and `OPENAI_SECRET`, respectively. The bot also relies on KV
storage to get some of its config, so you'll want to set that up too. The KV namespace you create should include values
for at least the keys `GPT_PROMPT` and `DALL_E_PROMPT`.

## Running Locally

You can sorta run the bot locally, but it relies on Cloudflare Queues, which may or may not run locally... not entirely
certain. You can use `yarn start` to try it out. You'll need to create a `.dev.vars` file first and put your secrets in
there.

## Deployment

Assuming you've got Wrangler set up properly, this should be as easy as `yarn deploy`.

## Issues

If you run into any, feel free to open an issue on this repo, but I can't guarantee a response.
