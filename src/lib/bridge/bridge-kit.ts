import { BridgeKit } from '@circle-fin/bridge-kit'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'

const kit = new BridgeKit()

// Create adapters from browser wallet providers
const adapter = await createViemAdapterFromProvider({
  provider: window.ethereum,
})

// Execute bridge operation
const result = await kit.bridge({
  from: { adapter, chain: 'Ethereum' },
  to: { adapter, chain: 'Base' },
  amount: '10.50',
})