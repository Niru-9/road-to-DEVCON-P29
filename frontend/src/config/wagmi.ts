import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

export const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});
