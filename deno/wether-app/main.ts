import { Root as AreasType } from "./area_type.ts";
import { TownListType } from "./types/main_type.ts";

import { Input } from "https://deno.land/x/cliffy@v0.25.7/prompt/input.ts";
const GetAreaWeekWeather = async (areaId: string) => {
  console.log(areaId)
  const AreaWeekWether = await fetch(
    `https://www.jma.go.jp/bosai/forecast/data/forecast/${areaId}.json`,
  );
  return AreaWeekWether.json();
};

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
  const TownNames = [
    TownList.map((value) => {
      return value.name;
    }),
    TownList.map((value) => {
      return value.kana;
    }),
    TownList.map((value) => {
      return value.enName;
    }),
  ].flatMap((value) => value);

  const CityName: string = await Input.prompt({
    message: "Choose a town name",
    list: true,
    info: true,
    suggestions: TownNames,
  });
  const Town = TownList.find((value) =>
    value.name == CityName || value.enName == CityName || value.kana
  );

  console.log(Town);
  if (Town) {
    const Wether = GetAreaWeekWeather(Town.key);
    console.log(await Wether);
  }
};

await main("千葉市");
