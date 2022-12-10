import { useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import { Cards } from "./component/Cards";
import { Blog } from "./component/Blog";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <Cards />
      <Blog />
    </div>
  );
}

export default App;
