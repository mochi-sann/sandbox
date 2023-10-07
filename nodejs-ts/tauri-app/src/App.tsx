import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { Button, Input } from "@mantine/core";
function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [fileList, setFileList] = useState<String[]>([]);
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }
  async function getFileLists(path: String = "/") {
    const fileListTemp: String[] = await invoke("get_file_list", {
      getDirPath: path,
    });
    console.log(fileListTemp);
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setFileList(fileListTemp);
  }

  return (
    <div className="container">
      <pre>{JSON.stringify(fileList)}</pre>

      <p>Hello woarld</p>

      <button
        onClick={() => {
          getFileLists();
        }}
        type="submit"
      >
        fileList
      </button>
      <p>{greetMsg}</p>
    </div>
  );
}

export default App;
