import { applyVueInReact } from "veaury";
import { useState } from "react";
import Button from "primevue/button";
import { applyPureVueInReact } from "veaury";
const VueButton = applyPureVueInReact(Button);
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
