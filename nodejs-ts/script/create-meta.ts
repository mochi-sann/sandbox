import emoji_json from "./emoji.json" with { type: "json" };
type Meta = {
  metaVersion?: number;
  host?: string;
  exportedAt?: string;
  emojis: Emoji[];
};

type Emoji = {
  downloaded: boolean;
  fileName: string;
  emoji: {
    id?: string;
    updatedAt?: string;
    name: string;
    host?: null;
    category: string;
    originalUrl?: string;
    publicUrl?: string;
    uri?: null;
    type?: string;
    aliases: string[];
  };
};

function get_name(str: String): str {
  const re = /(.*)\..*/;
  return str.match(re)[1] || "";
}
const get_aliases_texts  = (file_name : string ) : string[]   => {
  const result = emoji_json.find(value => value.name == file_name ) ;
  const res_list = result?.tags.split(" ") || []
  
  return res_list
}

const files = [];
const path = Deno.args[0];
for await (const file of Deno.readDir(path)) {
  files.push(file);
}

const emojis = files.map(
  (file): Emoji => ({
    downloaded: true,
    fileName: file.name,
    emoji: {
      name: get_name(file.name),
      category: "logos",

      aliases: get_aliases_texts(get_name(file.name)),
    },
  }),
);

const meta: Meta = { emojis };
// console.log(emoji_json)

console.log(JSON.stringify(meta , null ,2));
await Deno.writeTextFile("./out/meta.json", JSON.stringify(meta ,null ,2));
