import Image from 'next/image'
import styles from './page.module.css'
import stylex from "@stylexjs/stylex";
const s = stylex.create({
  redbox: {
    backgroundColor: "red",
    width: 100,
    height: 100,
  },
});


export default function Home() {
  return (
    <main className={styles.main}>
          <div className={stylex(s.redbox)}></div>
    </main>
  )
}
