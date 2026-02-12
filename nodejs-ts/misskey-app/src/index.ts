const {
  OPENROUTER_API_KEY,
  MISSKEY_BASE_URL,
  MISSKEY_API_TOKEN,
  OPENROUTER_MODEL = "openai/gpt-oss-20b",
  POST_INTERVAL_SEC = "300",
  OPENROUTER_SITE_URL = "https://example.com",
  OPENROUTER_SITE_NAME = "misskey-demo-bot",
} = process.env;
const BUILD_ID = "2026-02-11-retry-v3";

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

function maskKey(value: string): string {
  if (value.length <= 12) return "***";
  return `${value.slice(0, 10)}...${value.slice(-4)}`;
}

function parseDotEnvValue(content: string, key: string): string | null {
  const line = content
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${key}=`) && !item.startsWith(`#`));

  if (!line) return null;

  let value = line.slice(key.length + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  return value;
}

async function warnIfEnvOverriddenByShell(key: string): Promise<void> {
  const envFile = Bun.file(".env");
  if (!(await envFile.exists())) return;

  const envText = await envFile.text();
  const envValue = parseDotEnvValue(envText, key);
  const runtimeValue = process.env[key];
  if (!envValue || !runtimeValue) return;

  if (envValue !== runtimeValue) {
    console.warn(
      `[config] ${key} は .env よりシェル環境変数が優先されています。` +
        `現在はシェル値を使用中です。必要なら \`unset ${key}\` 後に再実行してください。`,
    );
  }
}

function buildOpenRouterError(status: number, detail: string): Error {
  if (status === 401) {
    return new Error(
      `OpenRouter API error (401): 認証に失敗しました。OPENROUTER_API_KEY が無効・失効・別アカウント発行の可能性があります。` +
        ` key=${maskKey(openRouterApiKey)} detail=${detail}`,
    );
  }
  return new Error(`OpenRouter API error (${status}): ${detail}`);
}

function textFromUnknownContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const parts = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!part || typeof part !== "object") return "";

        const record = part as Record<string, unknown>;
        if (typeof record.text === "string") return record.text;
        if (typeof record.content === "string") return record.content;
        return "";
      })
      .filter((part) => part.trim().length > 0);

    return parts.join("\n").trim();
  }

  return "";
}

function extractAssistantText(payload: unknown): {
  text: string;
  finishReason: string | null;
  debugChoiceKeys: string[];
  debugChoicePreview: string;
} {
  if (!payload || typeof payload !== "object") {
    return { text: "", finishReason: null, debugChoiceKeys: [], debugChoicePreview: "" };
  }

  const root = payload as Record<string, unknown>;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const firstChoice = (choices[0] ?? null) as Record<string, unknown> | null;

  if (!firstChoice) {
    return { text: "", finishReason: null, debugChoiceKeys: [], debugChoicePreview: "" };
  }
  const debugChoicePreview = JSON.stringify(firstChoice).slice(0, 300);

  const finishReason =
    typeof firstChoice.finish_reason === "string" ? firstChoice.finish_reason : null;

  const message =
    firstChoice.message && typeof firstChoice.message === "object"
      ? (firstChoice.message as Record<string, unknown>)
      : null;

  const fromMessage = textFromUnknownContent(message?.content);
  if (fromMessage) {
    return {
      text: fromMessage,
      finishReason,
      debugChoiceKeys: Object.keys(firstChoice),
      debugChoicePreview,
    };
  }

  const fromText = textFromUnknownContent(firstChoice.text);
  if (fromText) {
    return {
      text: fromText,
      finishReason,
      debugChoiceKeys: Object.keys(firstChoice),
      debugChoicePreview,
    };
  }

  return {
    text: "",
    finishReason,
    debugChoiceKeys: Object.keys(firstChoice),
    debugChoicePreview,
  };
}

type OpenRouterAttempt = {
  maxTokens: number;
  temperature: number;
  extraInstruction: string;
};

async function requestOpenRouter(attempt: OpenRouterAttempt): Promise<{
  payload: unknown;
  extracted: ReturnType<typeof extractAssistantText>;
}> {
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
      include_reasoning: false,
      reasoning: {
        effort: "low",
        exclude: true,
      },
      messages: [
        {
          role: "system",
          content:
            "You create short demo posts for a social platform. Keep them safe, positive, and in Japanese.",
        },
        {
          role: "user",
          content:
            "Misskeyのデモ用に、1〜2文の自然な投稿文を1つだけ作成してください。絵文字は0〜2個、ハッシュタグは1つまで。" +
            ` ${attempt.extraInstruction}`,
        },
      ],
      temperature: attempt.temperature,
      max_tokens: attempt.maxTokens,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw buildOpenRouterError(response.status, detail);
  }

  const payload = (await response.json()) as unknown;
  const extracted = extractAssistantText(payload);
  return { payload, extracted };
}

async function generateSampleText(): Promise<string> {
  const attempts: OpenRouterAttempt[] = [
    {
      maxTokens: 1024,
      temperature: 0.8,
      extraInstruction: "出力は投稿文のみを返してください。",
    },
    {
      maxTokens: 3072,
      temperature: 0.5,
      extraInstruction:
        "思考過程は出力せず、最終的な投稿文のみを返してください。本文が空にならないよう必ず1つ返してください。",
    },
  ];

  let lastError = "";

  for (const attempt of attempts) {
    const { extracted } = await requestOpenRouter(attempt);
    const { text, finishReason, debugChoiceKeys, debugChoicePreview } = extracted;
    if (text) {
      return text;
    }

    lastError =
      `finish_reason=${finishReason ?? "unknown"}, max_tokens=${attempt.maxTokens},` +
      ` choice_keys=${debugChoiceKeys.join(",") || "none"}, choice_preview=${debugChoicePreview || "none"}`;

    if (finishReason === "length") {
      console.warn(
        `[openrouter] 生成が長さ制限で切れました。max_tokens=${attempt.maxTokens} で空本文のため再試行します。`,
      );
    }
  }

  throw new Error(`OpenRouter returned empty content after retries (${lastError})`);
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
  console.log(`build=${BUILD_ID}`);
  console.log(`model=${OPENROUTER_MODEL}, interval=${postIntervalMs / 1000}s`);
  await warnIfEnvOverriddenByShell("OPENROUTER_API_KEY");
  if (!openRouterApiKey.startsWith("sk-or-v1-")) {
    console.warn("OPENROUTER_API_KEY の形式が想定と異なります（sk-or-v1- で始まらないキー）");
  }

  const runSafely = async (): Promise<void> => {
    try {
      await runOnce();
    } catch (error) {
      console.error("runOnce failed:", error);
    }
  };

  await runSafely();
  setInterval(() => {
    void runSafely();
  }, postIntervalMs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
