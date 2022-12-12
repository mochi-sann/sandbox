import { TwitterApi } from "npm:twitter-api-v2";

const username = Deno.env.toObject();
const TWITTER_API_TOKEN =
  "AAAAAAAAAAAAAAAAAAAAACWAGAEAAAAA4tJ8Fb4%2FLv%2BS5xCPIMVvuD3AKMQ%3DkoWIk5C6pjsd7VtykQGzKGZTfkpTPmzyhMqzMStIJbcKOXHmAD";

const twitterClient = new TwitterApi(TWITTER_API_TOKEN);
