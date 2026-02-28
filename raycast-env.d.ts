/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Worker URL - URL of the crypto-lookup Cloudflare Worker */
  "workerUrl": string,
  /** Ethereum Explorer - Base URL for Ethereum block explorer */
  "explorerEthereum": string,
  /** Base Explorer - Base URL for Base block explorer */
  "explorerBase": string,
  /** Arbitrum Explorer - Base URL for Arbitrum block explorer */
  "explorerArbitrum": string,
  /** Optimism Explorer - Base URL for Optimism block explorer */
  "explorerOptimism": string,
  /** Polygon Explorer - Base URL for Polygon block explorer */
  "explorerPolygon": string,
  /** BSC Explorer - Base URL for BSC block explorer */
  "explorerBSC": string,
  /** Avalanche Explorer - Base URL for Avalanche block explorer */
  "explorerAvalanche": string,
  /** Fantom Explorer - Base URL for Fantom block explorer */
  "explorerFantom": string,
  /** zkSync Era Explorer - Base URL for zkSync Era block explorer */
  "explorerZkSync": string,
  /** Linea Explorer - Base URL for Linea block explorer */
  "explorerLinea": string,
  /** Scroll Explorer - Base URL for Scroll block explorer */
  "explorerScroll": string,
  /** Mantle Explorer - Base URL for Mantle block explorer */
  "explorerMantle": string,
  /** Bitcoin Explorer - Base URL for Bitcoin block explorer */
  "explorerBitcoin": string,
  /** Solana Explorer - Base URL for Solana block explorer */
  "explorerSolana": string,
  /** Cosmos Hub Explorer - Base URL for Cosmos Hub block explorer */
  "explorerCosmos": string,
  /** Osmosis Explorer - Base URL for Osmosis block explorer */
  "explorerOsmosis": string,
  /** Celestia Explorer - Base URL for Celestia block explorer */
  "explorerCelestia": string,
  /** Sui Explorer - Base URL for Sui block explorer */
  "explorerSui": string,
  /** Aptos Explorer - Base URL for Aptos block explorer */
  "explorerAptos": string,
  /** Tron Explorer - Base URL for Tron block explorer */
  "explorerTron": string,
  /** TON Explorer - Base URL for TON block explorer */
  "explorerTON": string,
  /** Polkadot Explorer - Base URL for Polkadot block explorer */
  "explorerPolkadot": string,
  /** NEAR Explorer - Base URL for NEAR block explorer */
  "explorerNEAR": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search` command */
  export type Search = {}
}

