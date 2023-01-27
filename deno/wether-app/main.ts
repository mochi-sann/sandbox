import { Root as AreasType } from "./area_type.ts";
import { TownListType } from "./types/main_type.ts";

const main = async (name) => {
  const area = await fetch(
    "https://www.jma.go.jp/bosai/common/const/area.json",
  );
  const areaObject: AreasType = await area.json();
  // console.log(areaObject.class20s);
  const TownList: TownListType[] = Object.entries(areaObject.class20s).map((
    [key, value],
  ) => ({
    key,
    ...value,
  }));
  // console.log(TownList);
  const TownKeys = TownList.map((value) => {
    return value.key;
  });
  console.log(TownKeys)
};

await main("千葉市");
