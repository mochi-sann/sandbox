import { Link } from "waku";

import { Counter } from "../components/counter";
import { TextInput } from "../components/input";

export default async function HomePage() {
  const data = await getData();

  return (
    <div>
      <title>{data.title}</title>
      <h1 className="text-4xl font-bold tracking-tight">{data.headline}</h1>
      <p>{data.body}</p>
      <button className="btn btn-primary">Button</button>
      <Counter />
      <TextInput />
      <Link to="/about" className="mt-4 inline-block underline">
        About page
      </Link>
    </div>
  );
}

const getData = async () => {
  const data = {
    title: "Waku",
    headline: "Waku",
    body: "Hello world!",
  };

  return data;
};

export const getConfig = async () => {
  return {
    render: "static",
  };
};
