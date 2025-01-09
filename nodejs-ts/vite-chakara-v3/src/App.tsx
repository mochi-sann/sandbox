import { useState } from 'react'
import './App.css'
import { Button } from './components/ui/button'
import { Text } from '@chakra-ui/react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <Text>count : {count}</Text>
        <Button onClick={() => setCount((count) => count + 1)}>Increment</Button>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
