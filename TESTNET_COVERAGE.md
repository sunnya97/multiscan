# Testnet Coverage

## Supported Testnets

### Auto-detected (unique address format)
These testnets have address formats distinguishable from mainnet, so they are automatically detected:

| Chain | Testnet | Detection |
|-------|---------|-----------|
| Bitcoin | Bitcoin Testnet | `tb1` bech32 / `m`/`n` legacy prefix |
| Cardano | Cardano Preprod | `addr_test1` prefix |
| NEAR | NEAR Testnet | `.testnet` suffix |
| Litecoin | Litecoin Testnet | `tltc1` bech32 prefix |
| Filecoin | Filecoin Calibration | `t0`-`t4` prefix (vs `f0`-`f4`) |
| Kaspa | Kaspa Testnet | `kaspatest:` prefix (vs `kaspa:`) |
| Bitcoin Cash | Bitcoin Cash Testnet | `bchtest:` prefix (vs `bitcoincash:`) |

### Included but not auto-detected (same address format as mainnet)
These testnets share the same address format as mainnet. They exist in the chain registry for explorer URLs but cannot be automatically distinguished from mainnet addresses:

| Chain | Testnet(s) | Why not auto-detected |
|-------|-----------|----------------------|
| Ethereum | Sepolia, Holesky | Same 0x + 40 hex address format |
| Base | Base Sepolia | Same EVM address format |
| Arbitrum | Arbitrum Sepolia | Same EVM address format |
| Optimism | Optimism Sepolia | Same EVM address format |
| Polygon | Polygon Amoy | Same EVM address format |
| BSC | BSC Testnet | Same EVM address format |
| Avalanche | Avalanche Fuji | Same EVM address format |
| Fantom | Fantom Testnet | Same EVM address format |
| zkSync Era | zkSync Sepolia | Same EVM address format |
| Linea | Linea Sepolia | Same EVM address format |
| Scroll | Scroll Sepolia | Same EVM address format |
| Mantle | Mantle Sepolia | Same EVM address format |
| Ethereum Classic | Ethereum Classic Mordor | Same EVM address format |
| HyperEVM | HyperEVM Testnet | Same EVM address format |
| HyperCore | HyperCore Testnet | Same EVM address format |
| Solana | Solana Testnet, Devnet | Same base58 address format |
| Sui | Sui Testnet | Same 0x + 64 hex format |
| Aptos | Aptos Testnet | Same 0x + 64 hex format |
| Tron | Tron Shasta, Nile | Same T + base58 format |
| TON | TON Testnet | Same EQ/UQ format |
| Starknet | Starknet Sepolia | Same 0x + 64 hex format |
| XRP | XRP Testnet | Same r + base58 format |
| Stellar | Stellar Testnet | Same G + base32 format |
| Hedera | Hedera Testnet | Same 0.0.xxx format |
| Algorand | Algorand Testnet | Same 58-char base32 format |
| MultiversX | MultiversX Devnet | Same erd1 + bech32 format |
| Polkadot | Polkadot Westend | SS58 prefix `5` conflicts with Bittensor |
| Dogecoin | Dogecoin Testnet | `n`/`m` prefix conflicts with Bitcoin Testnet; not auto-detected |
| ZCash | ZCash Testnet | Same `t1`/`t3` transparent address prefix as mainnet |
| Dash | Dash Testnet | Same address format as mainnet |
| Lightning | Lightning Testnet | Same node pubkey format as mainnet |
| Osmosis | Osmosis Testnet | Same `osmo` bech32 prefix as mainnet |
| Celestia | Celestia Testnet | Same `celestia` bech32 prefix as mainnet |
| dYdX | dYdX Testnet | Same `dydx` bech32 prefix as mainnet |
| Injective | Injective Testnet | Same `inj` bech32 prefix as mainnet |
| Axelar | Axelar Testnet | Same `axelar` bech32 prefix as mainnet |
| Kava | Kava Testnet | Same `kava` bech32 prefix as mainnet |
| Persistence | Persistence Testnet | Same `persistence` bech32 prefix as mainnet |
| Archway | Archway Testnet | Same `archway` bech32 prefix as mainnet |
| Noble | Noble Testnet | Same `noble` bech32 prefix as mainnet |
| Neutron | Neutron Testnet | Same `neutron` bech32 prefix as mainnet |
| Coreum | Coreum Testnet | Same `core` bech32 prefix as mainnet |
| MANTRA | MANTRA Testnet | Same `mantra` bech32 prefix as mainnet |
| Babylon | Babylon Testnet | Same `bbn` bech32 prefix as mainnet |

## Not Supported

### Cosmos SDK chains without Mintscan testnet
The following Cosmos chains do not have a testnet listed on Mintscan: Cosmos Hub, Sei, Stride, Stargaze, Akash, Juno, Evmos, Secret, Band, Fetch.ai, Regen, Sentinel, Sommelier, Chihuahua, KYVE, Agoric, OmniFlix, Terra, Gravity Bridge, IRISnet, Cronos POS, Dymension, Nolus, Pryzm.

### Monero
**Reason:** Monero stagenet exists but has no public block explorer. Monero's privacy-focused architecture makes testnet exploration infrastructure rare.

### Bittensor
**Reason:** No standard testnet with a public block explorer. Bittensor's testnet infrastructure is focused on subnet testing rather than general-purpose exploration.
