// import * as styles from './HelloWorld.css';
import { style } from "@vanilla-extract/css";
import { HelloWorldCss } from "./HelloWorld.css";

export function HelloWorld() {
  return (
    <div className={HelloWorldCss}>
      <h1>
        こんにちはー!
      </h1>
      <h2>this is h2!!</h2>
    </div>
  );
}
