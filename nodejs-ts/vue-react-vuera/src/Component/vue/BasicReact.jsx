import { applyVueInReact } from "veaury";
import { useState } from "react";
import Button from "./Button.vue";
const VueButton = applyVueInReact(Button);

export function BasicReact() {
  const [state, setState] = useState({
    foo: Math.random(),
    currentTime: new Date().toLocaleString(),
  });
  return (
    <div>
      <h1>Basic React</h1>
      <p>This is a basic React component.</p>
      <VueButton>ぼたん</VueButton>
    </div>
  );
}
