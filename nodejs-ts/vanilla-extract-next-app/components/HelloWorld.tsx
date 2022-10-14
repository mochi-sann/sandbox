// import * as styles from './HelloWorld.css';
import {style} from "@vanilla-extract/css";

export const root = style({
    background: 'pink',
    color: 'blue',
    padding: '16px',
    transition: 'opacity .1s ease', // Testing autoprefixer
    ':hover': {
        opacity: 0.8,
    },

});
export function HelloWorld() {
    return (
        <div className={root}>
            <h1>🧁 Hello from vanilla-extract! this is awesome!!!!!!!!</h1>
            <h2>this is h2!!</h2>
        </div>
    );
}
