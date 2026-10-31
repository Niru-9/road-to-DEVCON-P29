export const QUADRATIC_FUNDING_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "projectId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "contributor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "ContributionReceived",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "projectId", "type": "uint256" }],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "projectId", "type": "uint256" }],
    "name": "getProjectDetails",
    "outputs": [
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "address", "name": "recipient", "type": "address" },
      { "internalType": "uint256", "name": "totalContributed", "type": "uint256" },
      { "internalType": "uint256", "name": "contributorCount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "matchingPoolBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const CONTRACT_ADDRESS_BASE_SEPOLIA = "0x892a0654c330fabda3c0cb9b37fb0a8b98211029";
