const {
  OPENROUTER_API_KEY,
  MISSKEY_BASE_URL,
  MISSKEY_API_TOKEN,
  OPENROUTER_MODEL = "openai/gpt-oss-20b",
  POST_INTERVAL_SEC = "300",
  OPENROUTER_SITE_URL = "https://example.com",
  OPENROUTER_SITE_NAME = "misskey-demo-bot",
} = process.env;

function mustGetEnv(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const openRouterApiKey = mustGetEnv("OPENROUTER_API_KEY", OPENROUTER_API_KEY);
const misskeyBaseUrl = mustGetEnv("MISSKEY_BASE_URL", MISSKEY_BASE_URL).replace(/\/$/, "");
const misskeyApiToken = mustGetEnv("MISSKEY_API_TOKEN", MISSKEY_API_TOKEN);

const postIntervalMs = Number.parseInt(POST_INTERVAL_SEC, 10) * 1000;
if (Number.isNaN(postIntervalMs) || postIntervalMs <= 0) {
  throw new Error("POST_INTERVAL_SEC must be a positive integer");
}

async function generateSampleText(): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": OPENROUTER_SITE_URL,
      "X-Title": OPENROUTER_SITE_NAME,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You create short demo posts for a social platform. Keep them safe, positive, and in Japanese.",
        },
        {
          role: "user",
          content:
            "Misskeyのデモ用に、1〜2文の自然な投稿文を1つだけ作成してください。絵文字は0〜2個、ハッシュタグは1つまで。",
        },
      ],
      temperature: 0.9,
      max_tokens: 120,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenRouter returned empty content");
  }

  return text;
}

async function postToMisskey(text: string): Promise<string> {
  const response = await fetch(`${misskeyBaseUrl}/api/notes/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      i: misskeyApiToken,
      text,
      visibility: "public",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Misskey API error (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as {
    createdNote?: { id?: string };
  };

  const noteId = payload.createdNote?.id;
  if (!noteId) {
    throw new Error("Misskey response did not include createdNote.id");
  }

  return noteId;
}

async function runOnce(): Promise<void> {
  const generated = await generateSampleText();
  const noteId = await postToMisskey(generated);

  const now = new Date().toISOString();
  console.log(`[${now}] posted noteId=${noteId}`);
  console.log(`text: ${generated}`);
}

async function main(): Promise<void> {
  console.log("Misskey demo bot started");
  console.log(`model=${OPENROUTER_MODEL}, interval=${postIntervalMs / 1000}s`);

  await runOnce();

  setInterval(() => {
    void runOnce().catch((error) => {
      console.error("runOnce failed:", error);
    });
  }, postIntervalMs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
