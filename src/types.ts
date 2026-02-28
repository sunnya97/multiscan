export type InputType = "address" | "transaction";

export type VerificationStatus = "unverified" | "found" | "not_found";

export interface ExplorerUrl {
  name: string;
  url: string;
}

export interface LookupResult {
  chainId: string;
  chainName: string;
  symbol: string;
  family: string;
  inputType: InputType;
  explorerUrls: ExplorerUrl[];
  status: VerificationStatus;
}

export interface WorkerResponse {
  results: LookupResult[];
  resolvedName?: string;
  resolvedAddress?: string;
  nameNotFound?: boolean;
}
