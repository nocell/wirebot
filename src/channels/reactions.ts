import type { EmojiMartData } from "@emoji-mart/data";
import data from "@emoji-mart/data/sets/15/native.json";
import type { WebClient } from "@slack/web-api";
import type { Message } from "discord.js";
import type { Api } from "grammy";
import type { ReactionTypeEmoji } from "grammy/types";

const emojiData: EmojiMartData = data;
const unicodeByName = new Map<string, string>();
const nameByUnicode = new Map<string, string>();

// ponytail: Unicode 15 shortcodes; upgrade the data set when newer names are needed.
for (const emoji of Object.values(emojiData.emojis)) {
  for (const [index, skin] of emoji.skins.entries()) {
    const name = index === 0 ? emoji.id : `${emoji.id}::skin-tone-${index + 1}`;
    unicodeByName.set(name, skin.native);
    nameByUnicode.set(withoutPresentation(skin.native), name);
  }
}

/** A standard or provider-custom shortcode, without its surrounding colons. */
function reactionName(reaction: string): string | undefined {
  return /^:([\w+-]+(?:::skin-tone-[2-6])?):$/u.exec(reaction.trim())?.[1];
}

/** Resolve a standard shortcode; leave valid Unicode emoji intact. */
export function unicodeReaction(reaction: string): string {
  const value = reaction.trim();
  const name = reactionName(value);
  if (name !== undefined) {
    const [base = "", tone] = name.split("::");
    const canonical = emojiData.aliases[base] ?? base;
    const unicode = unicodeByName.get(tone === undefined ? canonical : `${canonical}::${tone}`);
    if (unicode === undefined) throw new Error(`Unknown emoji shortcode: ${value}`);
    return unicode;
  }
  if (nameByUnicode.has(withoutPresentation(value)) || /^\p{RGI_Emoji}$/v.test(value)) return value;
  throw new Error("A reaction must be one emoji or an :emoji_shortcode:.");
}

/** Slack accepts names rather than Unicode, including workspace custom names. */
export function slackReaction(reaction: string): string {
  const name = reactionName(reaction) ?? nameByUnicode.get(withoutPresentation(reaction.trim()));
  if (name === undefined) throw new Error("No Slack name for this emoji; use its :shortcode:.");
  return name;
}

/** Presentation selectors do not change the emoji; Telegram expects them omitted. */
function withoutPresentation(emoji: string): string {
  return emoji.replaceAll("\uFE0F", "");
}

export async function reactToTelegramMessage(
  api: Pick<Api, "setMessageReaction">,
  chatId: number,
  messageId: number,
  reaction: string,
): Promise<void> {
  const customId = /^:custom_emoji_(\d{1,20}):$/u.exec(reaction.trim())?.[1];
  await api.setMessageReaction(chatId, messageId, [
    customId === undefined
      ? {
          type: "emoji",
          // Telegram validates its supported set; do not duplicate that changing list here.
          emoji: withoutPresentation(unicodeReaction(reaction)) as ReactionTypeEmoji["emoji"],
        }
      : { type: "custom_emoji", custom_emoji_id: customId },
  ]);
}

export async function reactToSlackMessage(
  web: Pick<WebClient, "reactions">,
  channel: string,
  timestamp: string,
  reaction: string,
): Promise<void> {
  try {
    await web.reactions.add({ channel, timestamp, name: slackReaction(reaction) });
  } catch (error) {
    if ((error as { data?: { error?: string } } | null)?.data?.error !== "already_reacted") {
      throw error;
    }
  }
}

export async function reactToDiscordMessage(
  message: Pick<Message, "react" | "guild">,
  reaction: string,
): Promise<void> {
  let emoji: string;
  if (/^<a?:\w{2,32}:\d{15,20}>$/u.test(reaction.trim())) {
    emoji = reaction.trim();
  } else {
    try {
      emoji = unicodeReaction(reaction);
    } catch (error) {
      const name = reactionName(reaction);
      if (name === undefined || message.guild === null) throw error;
      const emojis = await message.guild.emojis.fetch();
      const matches = emojis.filter((candidate) => candidate.name === name);
      const custom = matches.size === 1 ? matches.first() : undefined;
      if (custom === undefined) throw new Error(`No unique Discord custom emoji named :${name}:.`);
      emoji = custom.id;
    }
  }
  await message.react(emoji);
}
