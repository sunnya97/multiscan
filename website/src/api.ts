import { WorkerResponse } from "./types";

export async function fetchLookup(
  input: string,
  verify: boolean,
): Promise<WorkerResponse> {
  const response = await fetch("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, verify }),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  return (await response.json()) as WorkerResponse;
}
