import { tw } from "twind";

export default function HomePage() {
  return (
    <div>
      <button
        className={`${tw`p-4 px-8 hover:bg-blue-500 bg-blue-400 rounded`}`}
      >
        This is Button
      </button>
    </div>
  );
}
