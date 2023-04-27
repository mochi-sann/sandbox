"use client";
import React, { useState } from "react";

export const HookComponet = () => {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-500 focus:outline-none dark:focus:ring-blue-800 duration-200"
      onClick={() => {
        setCount((prev) => {
          return prev + 1;
        });
      }}
    >
      count : {count}
    </button>
  );
};
