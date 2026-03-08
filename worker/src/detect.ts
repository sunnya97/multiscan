import { Chain, CHAINS, InputType } from "./chains";

interface Match {
  chainId: string;
  inputType: InputType;
}

const BASE58_CHAR = "[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]";

// Urbit phoneme tables (256 suffixes, 256 prefixes)
const URBIT_SUFFIXES = new Set("zod nec bud wes sev per sut let ful pen syt dur wep ser wyl sun ryp syx dyr nup heb peg lup dep dys put lug hec ryt tyv syd nex lun mep lut sep pes del sul ped tem led tul met wen byn hex feb pyl dul het mev rut tyl wyd tep bes dex sef wyc bur der nep pur rys reb den nut sub pet rul syn reg tyd sup sem wyn rec meg net sec mul nym tev web sum mut nyx rex teb fus hep ben mus wyx sym sel ruc dec wex syr wet dyl myn mes det bet bel tux tug myr pel syp ter meb set dut deg tex sur fel tud nux rux ren wyt nub med lyt dus neb rum tyn seg lyx pun res red fun rev ref mec ted rus bex leb dux ryn num pyx ryg ryx fep tyr tus tyc leg nem fer mer ten lus nus syl tec mex pub rym tuc fyl lep deb ber mug hut tun byl sud pem dev lur def bus bep run mel pex dyt byt typ lev myl wed duc fur fex nul luc len ner lex rup ned lec ryd lyd fen wel nyd hus rel rud nes hes fet des ret dun ler nyr seb hul ryl lud rem lys fyn wer ryc sug nys nyl lyn dyn dem lux fed sed bec mun lyr tes mud nyt byr sen weg fyr mur tel rep teg pec nel nev fes".split(" "));
const URBIT_PREFIXES = new Set("doz mar bin wan sam lit sig hid fid lis sog dir wac sab wis sib rig sol dop mod fog lid hop dar dor lor hod fol rin tog sil mir hol pas lac rov liv dal sat lib tab han tic pid tor bol fos dot los dil for pil ram tir win tad bic dif roc wid bis das mid lop ril nar dap mol san loc nov sit nid tip sic rop wit nat pan min rit pod mot tam tol sav pos nap nop som fin fon ban mor wor sip ron nor bot wic soc wat dol mag pic dav bid bal tim tas mal lig siv tag pad sal div dac tan sid fab tar mon ran nis wol mis pal las dis map rab tob rol lat lon nod nav fig nom nib pag sop ral bil had doc rid moc pac rav rip fal tod til tin hap mic fan pat tac lab mog sim son pin lom ric tap fir has bos bat poc hac tid hav sap lin dib hos dab bit bar rac par lod dos bor toc hil mac tom dig fil fas mit hob har mig hin rad mas hal rag lag fad top mop hab nil nos mil fop fam dat nol din hat nac ris fot rib hoc nim lar fit wal rap sar nal mos lan don dan lad dov riv bac pol lap tal pit nam bon ros ton fod pon sov noc sor lav mat mip fip".split(" "));

function isValidUrbitName(name: string): boolean {
  // Galaxy: single suffix (3 chars)
  if (name.length === 3) return URBIT_SUFFIXES.has(name);
  // Star: prefix + suffix (6 chars)
  if (name.length === 6) return URBIT_PREFIXES.has(name.slice(0, 3)) && URBIT_SUFFIXES.has(name.slice(3));
  // Planet: prefix+suffix-prefix+suffix (13 chars with hyphen)
  if (name.length === 13 && name[6] === "-") {
    return URBIT_PREFIXES.has(name.slice(0, 3)) && URBIT_SUFFIXES.has(name.slice(3, 6))
      && URBIT_PREFIXES.has(name.slice(7, 10)) && URBIT_SUFFIXES.has(name.slice(10, 13));
  }
  return false;
}

// Build Cosmos lookup tables from CHAINS data
const COSMOS_CHAINS_LIST = CHAINS.filter((c) => c.family === "cosmos" && c.bech32Prefix);
const BECH32_PREFIX_TO_CHAIN = new Map(COSMOS_CHAINS_LIST.map((c) => [c.bech32Prefix!, c.id]));
const COSMOS_CHAIN_IDS = COSMOS_CHAINS_LIST.map((c) => c.id);

function getMatches(input: string): Match[] {
  const matches: Match[] = [];
  const trimmed = input.trim();

  if (!trimmed) return matches;

  // 0x + 40 hex chars = EVM address (42 chars total)
  if (/^0x[0-9a-fA-F]{40}$/i.test(trimmed)) {
    matches.push(
      { chainId: "ethereum", inputType: "address" },
      { chainId: "base", inputType: "address" },
      { chainId: "arbitrum", inputType: "address" },
      { chainId: "optimism", inputType: "address" },
      { chainId: "polygon", inputType: "address" },
      { chainId: "bsc", inputType: "address" },
      { chainId: "avalanche", inputType: "address" },
      { chainId: "fantom", inputType: "address" },
      { chainId: "zksync", inputType: "address" },
      { chainId: "linea", inputType: "address" },
      { chainId: "scroll", inputType: "address" },
      { chainId: "mantle", inputType: "address" },
      { chainId: "ethereum-classic", inputType: "address" },
      { chainId: "hyperliquid-evm", inputType: "address" },
      { chainId: "hyperliquid-core", inputType: "address" },
      { chainId: "berachain", inputType: "address" },
      { chainId: "ronin", inputType: "address" },
      { chainId: "flare", inputType: "address" },
      { chainId: "oasis-sapphire", inputType: "address" },
      { chainId: "core", inputType: "address" },
      { chainId: "monad", inputType: "address" },
      { chainId: "megaeth", inputType: "address" },
      { chainId: "plasma", inputType: "address" },
    );
    return matches;
  }

  // 0x + 64 hex chars (66 chars total) = EVM tx hash + Sui addr/tx + Aptos addr/tx
  if (/^0x[0-9a-fA-F]{64}$/i.test(trimmed)) {
    // EVM transaction
    matches.push(
      { chainId: "ethereum", inputType: "transaction" },
      { chainId: "base", inputType: "transaction" },
      { chainId: "arbitrum", inputType: "transaction" },
      { chainId: "optimism", inputType: "transaction" },
      { chainId: "polygon", inputType: "transaction" },
      { chainId: "bsc", inputType: "transaction" },
      { chainId: "avalanche", inputType: "transaction" },
      { chainId: "fantom", inputType: "transaction" },
      { chainId: "zksync", inputType: "transaction" },
      { chainId: "linea", inputType: "transaction" },
      { chainId: "scroll", inputType: "transaction" },
      { chainId: "mantle", inputType: "transaction" },
      { chainId: "ethereum-classic", inputType: "transaction" },
      { chainId: "hyperliquid-evm", inputType: "transaction" },
      { chainId: "hyperliquid-core", inputType: "transaction" },
      { chainId: "berachain", inputType: "transaction" },
      { chainId: "ronin", inputType: "transaction" },
      { chainId: "flare", inputType: "transaction" },
      { chainId: "oasis-sapphire", inputType: "transaction" },
      { chainId: "core", inputType: "transaction" },
      { chainId: "monad", inputType: "transaction" },
      { chainId: "megaeth", inputType: "transaction" },
      { chainId: "plasma", inputType: "transaction" },
    );
    // Sui address or transaction (both are 0x + 64 hex)
    matches.push({ chainId: "sui", inputType: "address" }, { chainId: "sui", inputType: "transaction" });
    // Aptos address or transaction
    matches.push({ chainId: "aptos", inputType: "address" }, { chainId: "aptos", inputType: "transaction" });
    // Movement address or transaction (Move-based, same format as Aptos)
    matches.push({ chainId: "movement", inputType: "address" }, { chainId: "movement", inputType: "transaction" });
    // IOTA address or transaction (post-rebasing, same 0x+64hex format)
    matches.push({ chainId: "iota", inputType: "address" }, { chainId: "iota", inputType: "transaction" });
    // Bittensor extrinsic hash
    matches.push({ chainId: "bittensor", inputType: "transaction" });
    // Starknet address or transaction
    matches.push({ chainId: "starknet", inputType: "address" }, { chainId: "starknet", inputType: "transaction" });
    return matches;
  }

  // IBC denom: ibc/ + 64 hex chars — candidate for all Cosmos chains
  if (/^ibc\/[0-9A-Fa-f]{64}$/i.test(trimmed)) {
    for (const chainId of COSMOS_CHAIN_IDS) {
      matches.push({ chainId, inputType: "denom" });
    }
    return matches;
  }

  // Factory denom: factory/<bech32>/... — match chain by bech32 prefix
  if (/^factory\/[a-z]+1[a-z0-9]+\/.+$/.test(trimmed)) {
    const bech32Addr = trimmed.split("/")[1];
    const prefix = bech32Addr.split("1")[0];
    const chainId = BECH32_PREFIX_TO_CHAIN.get(prefix);
    if (chainId) {
      matches.push({ chainId, inputType: "denom" });
    }
    return matches;
  }

  // Cosmos-family validator addresses — match by bech32 prefix + "valoper"
  for (const [prefix, chainId] of BECH32_PREFIX_TO_CHAIN) {
    const valoperRegex = new RegExp(`^${prefix}valoper1[a-z0-9]{38,58}$`);
    if (valoperRegex.test(trimmed)) {
      matches.push({ chainId, inputType: "validator" });
      return matches;
    }
  }

  // Cosmos-family addresses — match by bech32 prefix
  for (const [prefix, chainId] of BECH32_PREFIX_TO_CHAIN) {
    const regex = new RegExp(`^${prefix}1[a-z0-9]{38,58}$`);
    if (regex.test(trimmed)) {
      matches.push({ chainId, inputType: "address" });
      return matches;
    }
  }

  // Bitcoin addresses
  // Legacy (1...) and P2SH (3...) — base58, 25-34 chars
  const btcLegacyRegex = new RegExp(`^[13]${BASE58_CHAR}{24,33}$`);
  if (btcLegacyRegex.test(trimmed)) {
    matches.push({ chainId: "bitcoin", inputType: "address" });
    return matches;
  }
  // Bech32 (bc1...)
  if (/^bc1[a-zA-HJ-NP-Za-km-z0-9]{25,62}$/.test(trimmed)) {
    matches.push({ chainId: "bitcoin", inputType: "address" });
    return matches;
  }

  // Bitcoin Testnet: legacy (m/n + base58, 25-34 chars)
  const btcTestnetLegacyRegex = new RegExp(`^[mn]${BASE58_CHAR}{24,33}$`);
  if (btcTestnetLegacyRegex.test(trimmed)) {
    matches.push({ chainId: "bitcoin-testnet", inputType: "address" });
    return matches;
  }
  // Bitcoin Testnet: bech32 (tb1...)
  if (/^tb1[a-zA-HJ-NP-Za-km-z0-9]{25,62}$/.test(trimmed)) {
    matches.push({ chainId: "bitcoin-testnet", inputType: "address" });
    return matches;
  }

  // Dash address: X + base58 (25-34 chars), or 7 + base58 P2SH
  const dashAddrRegex = new RegExp(`^X${BASE58_CHAR}{24,33}$`);
  if (dashAddrRegex.test(trimmed)) {
    matches.push({ chainId: "dash", inputType: "address" });
    return matches;
  }

  // Dogecoin address: D + base58, 25-34 chars (legacy), A/9 for P2SH
  const dogeAddrRegex = new RegExp(`^[DA9]${BASE58_CHAR}{24,33}$`);
  if (dogeAddrRegex.test(trimmed)) {
    // D prefix is unique to Dogecoin; A/9 are Dogecoin P2SH
    if (trimmed[0] === "D" || trimmed[0] === "A" || trimmed[0] === "9") {
      matches.push({ chainId: "dogecoin", inputType: "address" });
      return matches;
    }
  }

  // Litecoin address: L/M + base58 (27-34 chars), or ltc1 bech32
  const ltcLegacyRegex = new RegExp(`^[LM]${BASE58_CHAR}{26,33}$`);
  if (ltcLegacyRegex.test(trimmed)) {
    matches.push({ chainId: "litecoin", inputType: "address" });
    return matches;
  }
  if (/^ltc1[a-zA-HJ-NP-Za-km-z0-9]{25,62}$/.test(trimmed)) {
    matches.push({ chainId: "litecoin", inputType: "address" });
    return matches;
  }

  // Litecoin Testnet: tltc1 bech32
  if (/^tltc1[a-zA-HJ-NP-Za-km-z0-9]{25,62}$/.test(trimmed)) {
    matches.push({ chainId: "litecoin-testnet", inputType: "address" });
    return matches;
  }

  // Bitcoin Cash CashAddr: q/p + base32 (42 chars), optionally prefixed with bitcoincash:
  if (/^(bitcoincash:)?[qp][a-z0-9]{41}$/.test(trimmed)) {
    matches.push({ chainId: "bitcoin-cash", inputType: "address" });
    return matches;
  }

  // Bitcoin Cash Testnet CashAddr: bchtest: prefix
  if (/^bchtest:[qp][a-z0-9]{41}$/.test(trimmed)) {
    matches.push({ chainId: "bitcoin-cash-testnet", inputType: "address" });
    return matches;
  }

  // ZCash address: t1/t3 + base58 (33 chars), or zs1 bech32
  const zcashTransparentRegex = new RegExp(`^t[13]${BASE58_CHAR}{32}$`);
  if (zcashTransparentRegex.test(trimmed)) {
    matches.push({ chainId: "zcash", inputType: "address" });
    return matches;
  }
  if (/^zs1[a-z0-9]{65,}$/.test(trimmed)) {
    matches.push({ chainId: "zcash", inputType: "address" });
    return matches;
  }

  // Monero address: starts with 4 or 8, 95 base58 chars
  const moneroAddrRegex = new RegExp(`^[48]${BASE58_CHAR}{94}$`);
  if (moneroAddrRegex.test(trimmed)) {
    matches.push({ chainId: "monero", inputType: "address" });
    return matches;
  }

  // XRP address: starts with r, base58 25-35 chars
  const xrpAddrRegex = new RegExp(`^r${BASE58_CHAR}{24,34}$`);
  if (xrpAddrRegex.test(trimmed)) {
    matches.push({ chainId: "xrp", inputType: "address" });
    return matches;
  }

  // Stellar address: starts with G, 56 chars (base32 uppercase)
  if (/^G[A-Z2-7]{55}$/.test(trimmed)) {
    matches.push({ chainId: "stellar", inputType: "address" });
    return matches;
  }

  // Bittensor address: starts with 5, SS58 format, 48 chars
  const bittensorAddrRegex = new RegExp(`^5${BASE58_CHAR}{47}$`);
  if (bittensorAddrRegex.test(trimmed)) {
    matches.push({ chainId: "bittensor", inputType: "address" });
    return matches;
  }

  // Cardano address: Shelley addr1 + bech32 (58+ chars), Byron Ae2/DdzFF + base58
  if (/^addr1[a-z0-9]{58,}$/.test(trimmed)) {
    matches.push({ chainId: "cardano", inputType: "address" });
    return matches;
  }
  // Cardano Testnet: addr_test1 + bech32
  if (/^addr_test1[a-z0-9]{50,}$/.test(trimmed)) {
    matches.push({ chainId: "cardano-preprod", inputType: "address" });
    return matches;
  }
  const cardanoByronRegex = new RegExp(`^(Ae2|DdzFF)${BASE58_CHAR}{50,}$`);
  if (cardanoByronRegex.test(trimmed)) {
    matches.push({ chainId: "cardano", inputType: "address" });
    return matches;
  }

  // Tron address: T + 33 base58 chars (34 chars total)
  const tronAddrRegex = new RegExp(`^T${BASE58_CHAR}{33}$`);
  if (tronAddrRegex.test(trimmed)) {
    matches.push({ chainId: "tron", inputType: "address" });
    return matches;
  }

  // TON address: EQ/UQ + 46 chars (raw format with hyphens/underscores), or raw format
  if (/^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(trimmed)) {
    matches.push({ chainId: "ton", inputType: "address" });
    return matches;
  }
  // TON raw address format: workchain:hex
  if (/^-?\d+:[0-9a-fA-F]{64}$/.test(trimmed)) {
    matches.push({ chainId: "ton", inputType: "address" });
    return matches;
  }

  // Polkadot address: 1 + 45-47 base58 chars
  const polkadotAddrRegex = new RegExp(`^1${BASE58_CHAR}{45,47}$`);
  if (polkadotAddrRegex.test(trimmed)) {
    matches.push({ chainId: "polkadot", inputType: "address" });
    return matches;
  }

  // NEAR named address: *.near
  if (/^[a-z0-9_-]+\.near$/.test(trimmed)) {
    matches.push({ chainId: "near", inputType: "address" });
    return matches;
  }
  // NEAR Testnet named address: *.testnet
  if (/^[a-z0-9_-]+\.testnet$/.test(trimmed)) {
    matches.push({ chainId: "near-testnet", inputType: "address" });
    return matches;
  }

  // Filecoin address: f0-f4 + alphanumeric
  if (/^f[0-4][a-z0-9]+$/i.test(trimmed)) {
    matches.push({ chainId: "filecoin", inputType: "address" });
    return matches;
  }

  // Filecoin Calibration testnet address: t0-t4 + alphanumeric
  // (placed after ZCash detection to avoid conflicts with t1/t3 transparent addresses)
  if (/^t[0-4][a-z0-9]+$/i.test(trimmed)) {
    matches.push({ chainId: "filecoin-calibration", inputType: "address" });
    return matches;
  }

  // Filecoin transaction (CID): bafy + base32
  if (/^bafy[a-z0-9]+$/i.test(trimmed)) {
    matches.push({ chainId: "filecoin", inputType: "transaction" });
    return matches;
  }

  // Hedera account: 0.0.digits
  if (/^0\.0\.\d+$/.test(trimmed)) {
    matches.push({ chainId: "hedera", inputType: "address" });
    return matches;
  }

  // Kaspa address: kaspa: prefix
  if (/^kaspa:[a-z0-9]+$/.test(trimmed)) {
    matches.push({ chainId: "kaspa", inputType: "address" });
    return matches;
  }

  // Kaspa Testnet: kaspatest: prefix
  if (/^kaspatest:[a-z0-9]+$/.test(trimmed)) {
    matches.push({ chainId: "kaspa-testnet", inputType: "address" });
    return matches;
  }

  // Algorand address: 58 uppercase base32 chars
  if (/^[A-Z2-7]{58}$/.test(trimmed)) {
    matches.push({ chainId: "algorand", inputType: "address" });
    return matches;
  }

  // MultiversX address: erd1 + 58 lowercase alphanumeric (62 chars total)
  if (/^erd1[a-z0-9]{58}$/.test(trimmed)) {
    matches.push({ chainId: "multiversx", inputType: "address" });
    return matches;
  }

  // Solana transaction signature: base58, 80-90 chars
  const solanaTxRegex = new RegExp(`^${BASE58_CHAR}{80,90}$`);
  if (solanaTxRegex.test(trimmed)) {
    matches.push({ chainId: "solana", inputType: "transaction" });
    return matches;
  }

  // Lightning Network: node pubkey (66 hex chars, no 0x prefix)
  if (/^[0-9a-fA-F]{66}$/.test(trimmed)) {
    matches.push({ chainId: "lightning", inputType: "address" });
    return matches;
  }

  // 64 hex chars (no 0x prefix) — could be Bitcoin tx, Cosmos txs, Tron tx, TON tx, Polkadot tx, NEAR implicit addr, UTXO txs
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    matches.push({ chainId: "bitcoin", inputType: "transaction" });
    matches.push({ chainId: "bitcoin-testnet", inputType: "transaction" });
    matches.push({ chainId: "dogecoin", inputType: "transaction" });
    matches.push({ chainId: "litecoin", inputType: "transaction" });
    matches.push({ chainId: "bitcoin-cash", inputType: "transaction" });
    matches.push({ chainId: "zcash", inputType: "transaction" });
    matches.push({ chainId: "dash", inputType: "transaction" });
    for (const chainId of COSMOS_CHAIN_IDS) {
      matches.push({ chainId, inputType: "transaction" });
    }
    matches.push(
      { chainId: "tron", inputType: "transaction" },
      { chainId: "ton", inputType: "transaction" },
      { chainId: "polkadot", inputType: "transaction" },
      { chainId: "near", inputType: "address" },
      { chainId: "monero", inputType: "transaction" },
      { chainId: "xrp", inputType: "transaction" },
      { chainId: "stellar", inputType: "transaction" },
      { chainId: "cardano", inputType: "transaction" },
      { chainId: "multiversx", inputType: "transaction" },
      { chainId: "kaspa", inputType: "transaction" },
    );
    return matches;
  }

  // Tezos address: tz1/tz2/tz3 (implicit accounts) or KT1 (contracts), 36 base58 chars
  const tezosAddrRegex = new RegExp(`^(tz[123]|KT1)${BASE58_CHAR}{33}$`);
  if (tezosAddrRegex.test(trimmed)) {
    matches.push({ chainId: "tezos", inputType: "address" });
    return matches;
  }

  // Tezos transaction (operation hash): starts with "o", 51 base58 chars
  const tezosTxRegex = new RegExp(`^o${BASE58_CHAR}{50}$`);
  if (tezosTxRegex.test(trimmed)) {
    matches.push({ chainId: "tezos", inputType: "transaction" });
    return matches;
  }

  // Aleo address: aleo1 + 58 bech32 chars (63 total)
  if (/^aleo1[a-z0-9]{58}$/.test(trimmed)) {
    matches.push({ chainId: "aleo", inputType: "address" });
    return matches;
  }

  // Aleo transaction: at1 + bech32 chars (~61 total)
  if (/^at1[a-z0-9]{58,}$/.test(trimmed)) {
    matches.push({ chainId: "aleo", inputType: "transaction" });
    return matches;
  }

  // Nano address: nano_ + 60 chars (65 total)
  if (/^nano_[13][a-z0-9]{59}$/.test(trimmed)) {
    matches.push({ chainId: "nano", inputType: "address" });
    return matches;
  }

  // Chia address: xch1 + 59 bech32 chars (62 total)
  if (/^xch1[a-z0-9]{59}$/.test(trimmed)) {
    matches.push({ chainId: "chia", inputType: "address" });
    return matches;
  }

  // Urbit ship name: ~galaxy (3 chars), ~star (6 chars), ~planet-planet (13 chars)
  // Accept with or without leading ~, validated against actual phoneme tables
  {
    const urbitInput = trimmed.startsWith("~") ? trimmed.slice(1) : trimmed;
    if (isValidUrbitName(urbitInput.toLowerCase())) {
      matches.push({ chainId: "urbit", inputType: "address" });
      return matches;
    }
  }

  // Nockchain address or transaction: base58, 50-60 chars
  // Placed after all specific-prefix chains to avoid conflicts
  const nockchainRegex = new RegExp(`^${BASE58_CHAR}{50,60}$`);
  if (nockchainRegex.test(trimmed)) {
    matches.push({ chainId: "nockchain", inputType: "address" });
    matches.push({ chainId: "nockchain", inputType: "transaction" });
    return matches;
  }

  // Solana address: base58, 32-44 chars
  const solanaAddrRegex = new RegExp(`^${BASE58_CHAR}{32,44}$`);
  if (solanaAddrRegex.test(trimmed)) {
    matches.push({ chainId: "solana", inputType: "address" });
    return matches;
  }

  return matches;
}

export interface ExplorerUrl {
  name: string;
  url: string;
}

export interface DetectionResult {
  chain: Chain;
  inputType: InputType;
  explorerUrls: ExplorerUrl[];
}

function buildExplorerUrls(chain: Chain, inputType: InputType, query: string): ExplorerUrl[] {
  return chain.explorers
    .map((explorer) => {
      let pathTemplate: string;
      if (inputType === "denom") {
        if (!explorer.denomPath) return null;
        pathTemplate = explorer.denomPath;
      } else if (inputType === "validator") {
        if (!explorer.validatorPath) return null;
        pathTemplate = explorer.validatorPath;
      } else {
        pathTemplate = inputType === "address" ? explorer.addressPath : explorer.txPath;
      }
      const path = pathTemplate.replace("{query}", encodeURIComponent(query));
      return { name: explorer.name, url: `${explorer.baseUrl}${path}` };
    })
    .filter((u): u is ExplorerUrl => u !== null);
}

export function detect(input: string, chains: Chain[]): DetectionResult[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const matches = getMatches(trimmed);
  const chainMap = new Map(chains.map((c) => [c.id, c]));

  return matches
    .map((m) => {
      const chain = chainMap.get(m.chainId);
      if (!chain) return null;
      // Normalize Urbit names to always include ~ prefix for explorer URLs
      let query = trimmed;
      if (chain.family === "urbit" && !trimmed.startsWith("~")) {
        query = `~${trimmed}`;
      }
      return {
        chain,
        inputType: m.inputType,
        explorerUrls: buildExplorerUrls(chain, m.inputType, query),
      };
    })
    .filter((r): r is DetectionResult => r !== null);
}
