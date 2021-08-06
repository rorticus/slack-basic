import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

export async function react(
    reaction: string,
    context: SlackEventMiddlewareArgs<'message'> & AllMiddlewareArgs,
) {
    await context.client.reactions.add({
        token: process.env.BOT_TOKEN,
        name: reaction,
        channel: context.message.channel,
        timestamp: context.message.ts,
    });
}
