import { z } from 'zod';

export const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'must be a 20-byte hex address');

export const bytes32Schema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'must be a 32-byte hex value');

export const roundParamsSchema = z.object({
  address: addressSchema,
});

export const projectParamsSchema = roundParamsSchema.extend({
  projectId: z.coerce.number().int().min(0),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const contributionQuerySchema = paginationSchema.extend({
  projectId: z.coerce.number().int().min(0).optional(),
  contributor: addressSchema.optional(),
});

export const resultsQuerySchema = z.object({
  includeBalance: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const proofBodySchema = z.object({
  address: addressSchema,
});

export const verifyProofBodySchema = z.object({
  address: addressSchema,
  proof: z.array(bytes32Schema).max(64).default([]),
  root: bytes32Schema.optional(),
});

export const contributeCalldataSchema = z.object({
  address: addressSchema,
  projectId: z.coerce.number().int().min(0),
  amountWei: z
    .string()
    .trim()
    .regex(/^\d+$/, 'amountWei must be a non-negative integer string')
    .refine((value) => BigInt(value) > 0n, 'amountWei must be greater than zero'),
});

export const adminAddRoundSchema = z.object({
  address: addressSchema,
  name: z.string().trim().min(1).max(160).optional(),
  startBlock: z.coerce.number().int().min(0).optional(),
});

export const adminImportEligibilitySchema = z
  .object({
    addresses: z
      .array(
        z.object({
          address: addressSchema,
          label: z.string().trim().max(200).optional(),
          source: z.string().trim().max(200).optional(),
        }),
      )
      .max(50_000)
      .optional(),
    csv: z.string().max(5_000_000).optional(),
    source: z.string().trim().max(200).optional(),
  })
  .refine((value) => Boolean(value.addresses?.length || value.csv?.trim()), {
    message: 'provide either addresses[] or a csv string',
  });

export const adminRegisterProjectSchema = z.object({
  payout: addressSchema,
  name: z.string().trim().min(1).max(160),
  metadataUri: z.string().trim().max(1_000).default(''),
});

export const adminFundPoolSchema = z.object({
  amountWei: z
    .string()
    .trim()
    .regex(/^\d+$/, 'amountWei must be a non-negative integer string')
    .refine((value) => BigInt(value) > 0n, 'amountWei must be greater than zero'),
});

export const adminReconcileSchema = z.object({
  repair: z.boolean().default(false),
});

export const adminSyncSchema = z.object({
  wait: z.boolean().default(true),
});
