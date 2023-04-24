import { HookComponet } from '@/components/test/HookComponet'
import { TestComponents } from '@/components/test/testComponents'
import { Inter } from 'next/font/google'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <TestComponents name={"Mochi "} />
      <HookComponet />
    </main>
  )
}
