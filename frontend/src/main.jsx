import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ChainProvider } from '@cosmos-kit/react';
import { getCosmosKitConfig } from './wallet/cosmosKit';

const kit = getCosmosKitConfig();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChainProvider
      chains={kit.chains}
      assetLists={kit.assetLists}
      wallets={kit.wallets}
      throwErrors={false}
    >
      <App />
    </ChainProvider>
  </React.StrictMode>
);
