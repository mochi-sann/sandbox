import React from "react";

import { faker } from "@faker-js/faker";

export const Cards: React.FC = () => {
  const DatasArryTemplate = [...Array(10)];
  const Datas = DatasArryTemplate.map(() => {
    return {
      body: faker.lorem.paragraphs(10),
      hoge: "hoge",
    };
  });

  return (
    <div>
      <pre>{JSON.stringify(Datas, null, 2)}</pre>
    </div>
  );
};
