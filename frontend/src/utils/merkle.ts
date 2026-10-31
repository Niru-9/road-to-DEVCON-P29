import { concat, encodeAbiParameters, getAddress, isAddress, keccak256, type Address, type Hex } from 'viem';

export interface KnownAttendee {
  address: Address;
  label: string;
  source: string;
}

// Bootstrap list matching deployed onchain root 0x8cb9e2e36fe9067175bda04ac3c341bbd275bd315a2380a3aab07c152a60cfbc
export const BOOTSTRAP_ATTENDEES: KnownAttendee[] = [
  {
    address: '0x0d3477209913afFAF06CDe63Dd0F13f4C5728135',
    label: 'Arjun (Operator)',
    source: 'local-bootstrap'
  },
  {
    address: '0xF859C8B7462a9e30Ee4ec627ca2cAab1b1a04DF7',
    label: 'Wallet A (Tamil & Kannada Translations)',
    source: 'local-bootstrap'
  },
  {
    address: '0xBc86656811F5D6e90AACE15B1cd9267658290a8D',
    label: 'Wallet B (Marathi Solidity Series)',
    source: 'local-bootstrap'
  }
];

// Extended Road to Devcon India attendees from fixtures
export const EXTENDED_ATTENDEES: KnownAttendee[] = [
  ...BOOTSTRAP_ATTENDEES,
  { address: '0x4cd9F186FB3ed767fAf9aB125a2171fEeC2F15A8', label: 'Asha', source: 'road-to-devcon-pune' },
  { address: '0x297a95C7797CeD9e4c34eD5E920ab8368782B03f', label: 'Bob', source: 'road-to-devcon-delhi' },
  { address: '0xeb9dA1c8769c3Ecb13118497f86AB18A7292da43', label: 'Chen', source: 'road-to-devcon-pune' },
  { address: '0x704Caa18CC8651f5Ffe044ecFDb4e994204a562e', label: 'Diego', source: 'road-to-devcon-lisbon' },
  { address: '0xECa76b2C4C0df7231eFAe1D49F73D176aF320016', label: 'Esha', source: 'road-to-devcon-delhi' },
  { address: '0xDe8bC30916243795157beB5DcA827e036538f598', label: 'Farah', source: 'road-to-devcon-dubai' },
  { address: '0x904a406DAb5aD5984d9B47a32359a09E0cA5C1d4', label: 'Gita', source: 'road-to-devcon-pune' },
  { address: '0x4C1277e4C44193aF104739D7eE10006668eEcaF8', label: 'Hugo', source: 'road-to-devcon-lisbon' },
  { address: '0xAE1E258e5CceB63D1B3A7A0f498fe7c181c012f6', label: 'Isha', source: 'road-to-devcon-delhi' },
  { address: '0x10Bb1E22657eaa643aD4eC779716Dae41fC7bE37', label: 'Jamal', source: 'road-to-devcon-dubai' },
  { address: '0x7Fa45AE0505E648c4199D9cc65A434a38c6731bf', label: 'Kavya', source: 'road-to-devcon-pune' },
  { address: '0x6d8D0DfaAA5c588673F23a073c009c50B1b82d5D', label: 'Liam', source: 'road-to-devcon-lisbon' }
];

export function leafForAddress(address: string): Hex {
  return keccak256(
    encodeAbiParameters([{ type: 'address' }], [getAddress(address)])
  );
}

function compareHex(a: Hex, b: Hex): number {
  const left = BigInt(a);
  const right = BigInt(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function hashPair(a: Hex, b: Hex): Hex {
  return compareHex(a, b) <= 0 ? keccak256(concat([a, b])) : keccak256(concat([b, a]));
}

export function buildMerkleTree(attendees: KnownAttendee[]) {
  const leaves: Hex[] = attendees.map(a => leafForAddress(a.address));
  if (leaves.length === 0) {
    return { root: '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex, layers: [] };
  }

  const layers: Hex[][] = [leaves];
  let currentLayer = leaves;

  while (currentLayer.length > 1) {
    const nextLayer: Hex[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
      } else {
        nextLayer.push(currentLayer[i]);
      }
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return {
    root: currentLayer[0],
    layers,
    leaves
  };
}

// Compute the deployed bootstrap tree once
export const BOOTSTRAP_TREE = buildMerkleTree(BOOTSTRAP_ATTENDEES);

export function getMerkleProofForAddress(target: string, useExtended = false) {
  if (!isAddress(target)) {
    return {
      isEligible: false,
      leaf: '0x' as Hex,
      proof: [] as Hex[],
      root: BOOTSTRAP_TREE.root,
      label: 'Invalid Address'
    };
  }

  const normalized = getAddress(target);
  const attendeeList = useExtended ? EXTENDED_ATTENDEES : BOOTSTRAP_ATTENDEES;
  const tree = useExtended ? buildMerkleTree(EXTENDED_ATTENDEES) : BOOTSTRAP_TREE;

  const index = attendeeList.findIndex(a => a.address.toLowerCase() === normalized.toLowerCase());
  const leaf = leafForAddress(normalized);

  if (index === -1) {
    return {
      isEligible: false,
      leaf,
      proof: [] as Hex[],
      root: tree.root,
      label: 'Not in Attendee List'
    };
  }

  const proof: Hex[] = [];
  let currentIndex = index;

  for (let i = 0; i < tree.layers.length - 1; i++) {
    const layer = tree.layers[i];
    const isRightNode = currentIndex % 2 === 1;
    const pairIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

    if (pairIndex < layer.length) {
      proof.push(layer[pairIndex]);
    }
    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    isEligible: true,
    leaf,
    proof,
    root: tree.root,
    label: attendeeList[index].label,
    source: attendeeList[index].source
  };
}
