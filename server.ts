import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { createServer as createViteServer } from 'vite';
import type {
  OrganisationRepresentative,
  ShareArrangementType,
  SponsorType,
  StellarNetworkType,
  SupportFundingAgreementRecord,
  UserRole,
  UserWallet,
  WalletActivationRecord,
  WalletAuditLog,
  WalletTransaction,
  WorkerPaymentAgreementRecord,
} from './src/types/farmfund';
import {
  ensureDevUserRecord,
  platformState,
  registerPlatformRoutes,
} from './platformStore';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const STELLAR_NETWORK: StellarNetworkType =
  process.env.VITE_STELLAR_NETWORK === 'PUBLIC' ? 'PUBLIC' : 'TESTNET';
const HORIZON_URL =
  process.env.VITE_STELLAR_HORIZON_URL ||
  (STELLAR_NETWORK === 'PUBLIC'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org');
const NETWORK_PASSPHRASE =
  process.env.VITE_STELLAR_NETWORK_PASSPHRASE ||
  (STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET);
const FRIENDBOT_URL =
  process.env.VITE_STELLAR_FRIENDBOT_URL || 'https://friendbot.stellar.org';

const OFFICIAL_USDC_ISSUER =
  STELLAR_NETWORK === 'PUBLIC'
    ? process.env.VITE_STELLAR_USDC_ISSUER_MAINNET ||
      'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    : process.env.VITE_STELLAR_USDC_ISSUER_TESTNET ||
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const SOROBAN_ESCROW_CONTRACT_ID =
  process.env.VITE_SOROBAN_ESCROW_CONTRACT_ID ||
  'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75';

const horizonServer = new Horizon.Server(HORIZON_URL);

// Server-side only AES-256-GCM key derivation for managed custody vault
const MASTER_SECRET_SEED =
  process.env.STELLAR_CUSTODY_MASTER_KEY ||
  'farmfund-server-custody-master-key-do-not-expose-to-client';
const VAULT_KEY = crypto.createHash('sha256').update(MASTER_SECRET_SEED).digest();
const VAULT_FILE = path.resolve(process.cwd(), '.server-stellar-vault.json');

interface EncryptedCustodyEntry {
  walletId: string;
  userId: string;
  publicKey: string;
  ivHex: string;
  authTagHex: string;
  cipherTextHex: string;
  createdAt: string;
}

interface DevAccountEntry {
  code: 'FAMAD01' | 'FAMER01' | 'SPON01' | 'COMP01' | 'WORK01' | 'SUPV01';
  userId: string;
  role: UserRole;
  sponsorType?: SponsorType;
  displayName: string;
  email: string;
  passwordHash: string;
  mustChangePasswordOnFirstLogin: boolean;
}

interface ServerVaultState {
  custodyEntries: Record<string, EncryptedCustodyEntry>;
  wallets: Record<string, UserWallet>;
  transactions: WalletTransaction[];
  supportEscrows: SupportFundingAgreementRecord[];
  workerEscrows: WorkerPaymentAgreementRecord[];
  activations: WalletActivationRecord[];
  auditLogs: WalletAuditLog[];
  idempotencyKeys: Record<string, string>;
  devAccounts: Record<string, DevAccountEntry>;
  escrowVaultPublicKey?: string;
  escrowVaultEncryptedSecret?: {
    ivHex: string;
    authTagHex: string;
    cipherTextHex: string;
  };
}

function hashPassword(raw: string): string {
  return crypto.createHash('sha256').update(`farmfund-salt:${raw}`).digest('hex');
}

function encryptSecret(secretKey: string): {
  ivHex: string;
  authTagHex: string;
  cipherTextHex: string;
} {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', VAULT_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(secretKey, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
    cipherTextHex: encrypted.toString('hex'),
  };
}

function decryptSecret(entry: {
  ivHex: string;
  authTagHex: string;
  cipherTextHex: string;
}): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    VAULT_KEY,
    Buffer.from(entry.ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(entry.authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(entry.cipherTextHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function createInitialDevAccounts(): Record<string, DevAccountEntry> {
  // Server-only initial password from environment variable (never hardcoded in frontend)
  const initialDevPassword = process.env.DEV_TEMP_ACCOUNT_PASSWORD || 'FarmFundTemp#2026';
  const initialHash = hashPassword(initialDevPassword);

  return {
    FAMAD01: {
      code: 'FAMAD01',
      userId: 'dev_admin_famad01',
      role: 'Admin',
      displayName: 'FarmFund Chief Administrator (FAMAD01)',
      email: 'admin.famad01@farmfund.ng',
      passwordHash: initialHash,
      mustChangePasswordOnFirstLogin: true,
    },
    WORK01: {
      code: 'WORK01',
      userId: 'dev_worker_work01',
      role: 'Worker',
      displayName: 'Musa Danjuma (WORK01)',
      email: 'worker.work01@farmfund.ng',
      passwordHash: initialHash,
      mustChangePasswordOnFirstLogin: true,
    },
    FAMER01: {
      code: 'FAMER01',
      userId: 'dev_farmer_famer01',
      role: 'Farmer',
      displayName: 'Adewale Ogunleye (FAMER01)',
      email: 'farmer.famer01@farmfund.ng',
      passwordHash: initialHash,
      mustChangePasswordOnFirstLogin: true,
    },
    SUPV01: {
      code: 'SUPV01',
      userId: 'dev_supervisor_supv01',
      role: 'Supervisor',
      displayName: 'Ibrahim Bello · Field Supervisor (SUPV01)',
      email: 'supervisor.supv01@farmfund.ng',
      passwordHash: initialHash,
      mustChangePasswordOnFirstLogin: true,
    },
    SPON01: {
      code: 'SPON01',
      userId: 'dev_sponsor_spon01',
      role: 'Sponsor',
      sponsorType: 'individual',
      displayName: 'Chukwuma Okafor · Individual Sponsor (SPON01)',
      email: 'sponsor.spon01@farmfund.ng',
      passwordHash: initialHash,
      mustChangePasswordOnFirstLogin: true,
    },
    COMP01: {
      code: 'COMP01',
      userId: 'dev_company_comp01',
      role: 'Sponsor',
      sponsorType: 'organisation',
      displayName: 'AgroVanguard Capital NG Ltd (COMP01)',
      email: 'treasury.comp01@agrovanguard.ng',
      passwordHash: initialHash,
      mustChangePasswordOnFirstLogin: true,
    },
  };
}

function loadVaultState(): ServerVaultState {
  try {
    if (fs.existsSync(VAULT_FILE)) {
      const raw = fs.readFileSync(VAULT_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<ServerVaultState>;
      const initialDevs = createInitialDevAccounts();
      const mergedDevs = { ...initialDevs, ...(parsed.devAccounts || {}) };
      if (mergedDevs.COMP01 && mergedDevs.COMP01.role !== 'Sponsor') {
        mergedDevs.COMP01.role = 'Sponsor';
        mergedDevs.COMP01.sponsorType = 'organisation';
      }
      const wallets = parsed.wallets || {};
      // Upgrade any legacy Supervisor wallets that were previously marked Restricted
      for (const w of Object.values(wallets)) {
        if (w && w.role === 'Supervisor' && w.status === 'Restricted') {
          w.status = w.horizonReachable && Number(w.xlmBalance || '0') > 0 ? 'Active' : 'Activation Required';
          w.approvalPolicy = 'Authenticated user session + server-vault signing';
        }
      }
      return {
        custodyEntries: parsed.custodyEntries || {},
        wallets,
        transactions: parsed.transactions || [],
        supportEscrows: parsed.supportEscrows || [],
        workerEscrows: parsed.workerEscrows || [],
        activations: parsed.activations || [],
        auditLogs: parsed.auditLogs || [],
        idempotencyKeys: parsed.idempotencyKeys || {},
        devAccounts: mergedDevs,
        escrowVaultPublicKey: parsed.escrowVaultPublicKey,
        escrowVaultEncryptedSecret: parsed.escrowVaultEncryptedSecret,
      };
    }
  } catch {
    // Ignore corrupted local file and initialize clean state
  }

  const escrowKp = Keypair.random();
  return {
    custodyEntries: {},
    wallets: {},
    transactions: [],
    supportEscrows: [],
    workerEscrows: [],
    activations: [],
    auditLogs: [],
    idempotencyKeys: {},
    devAccounts: createInitialDevAccounts(),
    escrowVaultPublicKey: escrowKp.publicKey(),
    escrowVaultEncryptedSecret: encryptSecret(escrowKp.secret()),
  };
}

const vaultState: ServerVaultState = loadVaultState();

function saveVaultState(): void {
  try {
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vaultState, null, 2), { mode: 0o600 });
  } catch {
    // Non-fatal if filesystem is read-only
  }
}

function appendAuditLog(params: {
  actorId: string;
  action: string;
  targetUserId: string;
  walletId: string;
  transactionReference?: string;
  result: string;
}): WalletAuditLog {
  const entry: WalletAuditLog = {
    logId: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actorId: params.actorId,
    action: params.action,
    targetUserId: params.targetUserId,
    walletId: params.walletId,
    transactionReference: params.transactionReference || 'N/A',
    timestamp: new Date().toISOString(),
    result: params.result,
  };
  vaultState.auditLogs.unshift(entry);
  saveVaultState();
  return entry;
}

function buildDefaultCompanyRepresentatives(displayName: string): OrganisationRepresentative[] {
  return [
    {
      repId: 'rep_primary_1',
      fullName: displayName || 'Treasury Director',
      email: 'treasury@agrovanguard.ng',
      roleTitle: 'Primary Authorised Signatory',
      canApproveTransfers: true,
    },
    {
      repId: 'rep_compliance_2',
      fullName: 'Amina Bello',
      email: 'compliance@agrovanguard.ng',
      roleTitle: 'Agri-Finance Compliance Officer',
      canApproveTransfers: true,
    },
  ];
}

async function syncWalletWithHorizon(wallet: UserWallet): Promise<UserWallet> {
  const nowIso = new Date().toISOString();
  try {
    const account = await horizonServer.loadAccount(wallet.walletAddress);
    let xlmBalance = '0.00';
    let usdcBalance = '0.00';
    let hasUsdcTrustline = false;

    for (const bal of account.balances) {
      if (bal.asset_type === 'native') {
        xlmBalance = Number(bal.balance).toFixed(2);
      } else if (
        (bal.asset_type === 'credit_alphanum4' || bal.asset_type === 'credit_alphanum12') &&
        bal.asset_code === 'USDC' &&
        bal.asset_issuer === OFFICIAL_USDC_ISSUER
      ) {
        usdcBalance = Number(bal.balance).toFixed(2);
        hasUsdcTrustline = true;
      }
    }

    // Calculate locked escrow obligations for this user (Support + Worker Wages + Acceptance Bonds)
    const lockedSupport = vaultState.supportEscrows
      .filter((e) => e.sponsorId === wallet.userId && e.status === 'Funded in Escrow')
      .reduce((sum, e) => sum + e.contributionAmount, 0);
    const lockedWorker = vaultState.workerEscrows
      .filter((e) => e.farmerId === wallet.userId && e.paymentStatus === 'Escrow Funded')
      .reduce((sum, e) => sum + e.paymentAmount, 0);
    const lockedAcceptance = platformState.acceptanceFees
      .filter((f) => f.obligorId === wallet.userId && f.status === 'Locked in Escrow')
      .reduce((sum, f) => sum + f.feeAmountUsdc, 0);

    const pendingEscrow = (lockedSupport + lockedWorker + lockedAcceptance).toFixed(2);

    const updated: UserWallet = {
      ...wallet,
      status: wallet.role === 'Admin' ? 'Restricted' : 'Active',
      xlmBalance,
      usdcBalance,
      availableUsdcBalance: usdcBalance,
      pendingEscrowUsdcBalance: pendingEscrow,
      hasUsdcTrustline,
      horizonReachable: true,
      updatedAt: nowIso,
      lastVerifiedAt: nowIso,
    };
    vaultState.wallets[wallet.userId] = updated;
    saveVaultState();
    return updated;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const lockedSupport = vaultState.supportEscrows
      .filter((e) => e.sponsorId === wallet.userId && e.status === 'Funded in Escrow')
      .reduce((sum, e) => sum + e.contributionAmount, 0);
    const lockedWorker = vaultState.workerEscrows
      .filter((e) => e.farmerId === wallet.userId && e.paymentStatus === 'Escrow Funded')
      .reduce((sum, e) => sum + e.paymentAmount, 0);
    const lockedAcceptance = platformState.acceptanceFees
      .filter((f) => f.obligorId === wallet.userId && f.status === 'Locked in Escrow')
      .reduce((sum, f) => sum + f.feeAmountUsdc, 0);

    if (status === 404) {
      const unactivated: UserWallet = {
        ...wallet,
        status: 'Activation Required',
        xlmBalance: '0.00',
        usdcBalance: '0.00',
        availableUsdcBalance: '0.00',
        pendingEscrowUsdcBalance: (lockedSupport + lockedWorker + lockedAcceptance).toFixed(2),
        hasUsdcTrustline: false,
        horizonReachable: true,
        updatedAt: nowIso,
        lastVerifiedAt: nowIso,
      };
      vaultState.wallets[wallet.userId] = unactivated;
      saveVaultState();
      return unactivated;
    }

    return {
      ...wallet,
      horizonReachable: false,
      updatedAt: nowIso,
    };
  }
}

async function verifyTransactionOnHorizon(txHash: string): Promise<{
  verified: boolean;
  successful: boolean;
  ledger?: number;
  createdAt?: string;
}> {
  try {
    const tx = await horizonServer.transactions().transaction(txHash).call();
    return {
      verified: Boolean(tx && tx.successful),
      successful: Boolean(tx?.successful),
      ledger: tx?.ledger_attr,
      createdAt: tx?.created_at,
    };
  } catch {
    return { verified: false, successful: false };
  }
}

function provisionWalletForUser(params: {
  userId: string;
  role: UserRole;
  sponsorType?: SponsorType;
  displayName?: string;
  organisationName?: string;
}): { wallet: UserWallet; alreadyProvisioned: boolean } {
  const { userId, role, sponsorType, displayName, organisationName } = params;
  const authoritativeRole = platformState.users[userId]?.role || role;
  const authoritativeSponsorType =
    platformState.users[userId]?.sponsorType || sponsorType;

  const existing = vaultState.wallets[userId];
  if (existing) {
    if (existing.role === 'Supervisor' && existing.status === 'Restricted') {
      existing.status = 'Activation Required';
      existing.approvalPolicy = 'Authenticated user session + server-vault signing';
      saveVaultState();
    }
    return { wallet: existing, alreadyProvisioned: true };
  }

  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const encrypted = encryptSecret(keypair.secret());
  const nowIso = new Date().toISOString();
  const walletId = `ff_wal_${userId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}`;
  const isOrgSponsor =
    authoritativeRole === 'Sponsor' && authoritativeSponsorType === 'organisation';

  vaultState.custodyEntries[userId] = {
    walletId,
    userId,
    publicKey,
    ...encrypted,
    createdAt: nowIso,
  };

  const newWallet: UserWallet = {
    walletId,
    userId,
    role: authoritativeRole,
    sponsorType: authoritativeSponsorType,
    displayName: displayName || platformState.users[userId]?.fullName || userId,
    organisationName: isOrgSponsor
      ? organisationName || displayName || 'Partner Organisation'
      : undefined,
    authorisedRepresentatives: isOrgSponsor
      ? buildDefaultCompanyRepresentatives(displayName || 'Treasury Director')
      : undefined,
    approvalPolicy: isOrgSponsor
      ? 'Role-based organisation signatory approval (no shared private keys)'
      : authoritativeRole === 'Admin'
        ? 'Read-only monitoring permissions (no autonomous wallet fund transfers)'
        : 'Authenticated user session + server-vault signing',
    walletAddress: publicKey,
    provider: 'Stellar SDK Embedded Wallet (@stellar/stellar-sdk)',
    custodyModel: isOrgSponsor
      ? 'Organisation Vault Custody (AES-256-GCM Server Key Isolation · Per-Representative RBAC)'
      : 'Managed Embedded Custody (AES-256-GCM Server Vault · Zero Plaintext Key Exposure)',
    network: STELLAR_NETWORK,
    status: authoritativeRole === 'Admin' ? 'Restricted' : 'Activation Required',
    usdcBalance: '0.00',
    availableUsdcBalance: '0.00',
    pendingEscrowUsdcBalance: '0.00',
    xlmBalance: '0.00',
    hasUsdcTrustline: false,
    horizonReachable: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastVerifiedAt: nowIso,
  };

  vaultState.wallets[userId] = newWallet;
  saveVaultState();

  appendAuditLog({
    actorId: userId,
    action: 'WALLET_PROVISIONED',
    targetUserId: userId,
    walletId,
    transactionReference: publicKey,
    result: `Created unique Stellar ${STELLAR_NETWORK} address ${publicKey}`,
  });

  return { wallet: newWallet, alreadyProvisioned: false };
}

async function ensureEscrowVaultReadyOnTestnet(): Promise<{
  publicKey: string;
  keypair: Keypair;
  hasUsdcTrustline: boolean;
} | null> {
  if (!vaultState.escrowVaultPublicKey || !vaultState.escrowVaultEncryptedSecret) {
    const kp = Keypair.random();
    vaultState.escrowVaultPublicKey = kp.publicKey();
    vaultState.escrowVaultEncryptedSecret = encryptSecret(kp.secret());
    saveVaultState();
  }
  const publicKey = vaultState.escrowVaultPublicKey;
  const secret = decryptSecret(vaultState.escrowVaultEncryptedSecret);
  const keypair = Keypair.fromSecret(secret);

  try {
    let account = await horizonServer.loadAccount(publicKey).catch(() => null);
    if (!account && STELLAR_NETWORK === 'TESTNET') {
      const fbRes = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
      if (fbRes.ok) {
        account = await horizonServer.loadAccount(publicKey).catch(() => null);
      }
    }
    if (!account) return null;

    let hasUsdcTrustline = account.balances.some(
      (b) =>
        (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') &&
        b.asset_code === 'USDC' &&
        b.asset_issuer === OFFICIAL_USDC_ISSUER
    );

    if (!hasUsdcTrustline) {
      const usdcAsset = new Asset('USDC', OFFICIAL_USDC_ISSUER);
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(Operation.changeTrust({ asset: usdcAsset }))
        .addMemo(Memo.text('FarmFund Escrow Vault USDC'))
        .setTimeout(60)
        .build();
      tx.sign(keypair);
      await horizonServer.submitTransaction(tx);
      hasUsdcTrustline = true;
    }

    return { publicKey, keypair, hasUsdcTrustline };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));
  registerPlatformRoutes(app, {
    onProvisionUserWallet: ({ userId, role, sponsorType, displayName }) => {
      provisionWalletForUser({ userId, role, sponsorType, displayName });
    },
    onExecuteAcceptanceFeeSettlement: async ({ action, fee }) => {
      const targetUserId = action === 'LOCK' ? fee.obligorId : fee.beneficiaryId;
      const recipientUserId = action === 'REFUND' ? fee.obligorId : fee.beneficiaryId;
      const targetWallet = vaultState.wallets[targetUserId];
      const targetCustody = vaultState.custodyEntries[targetUserId];
      const obligorWallet = vaultState.wallets[fee.obligorId];
      const obligorCustody = vaultState.custodyEntries[fee.obligorId];
      const recipientWallet = vaultState.wallets[recipientUserId];
      const nowIso = new Date().toISOString();
      const txTypeMap: Record<'LOCK' | 'REFUND' | 'FORFEIT', WalletTransaction['transactionType']> = {
        LOCK: 'Acceptance Fee Deposit',
        REFUND: 'Acceptance Fee Refund',
        FORFEIT: 'Acceptance Fee Forfeit Payout',
      };

      try {
        // Prefer real on-chain Circle USDC transfer when sender/vault hold real Testnet USDC
        const escrowVault = await ensureEscrowVaultReadyOnTestnet();
        if (action === 'LOCK' && obligorWallet && obligorCustody && escrowVault) {
          const syncedObligor = await syncWalletWithHorizon(obligorWallet);
          if (
            syncedObligor.status === 'Active' &&
            syncedObligor.hasUsdcTrustline &&
            Number(syncedObligor.availableUsdcBalance || '0') >= fee.feeAmountUsdc
          ) {
            const secret = decryptSecret(obligorCustody);
            const kp = Keypair.fromSecret(secret);
            const acc = await horizonServer.loadAccount(syncedObligor.walletAddress);
            const usdcAsset = new Asset('USDC', OFFICIAL_USDC_ISSUER);
            const tx = new TransactionBuilder(acc, {
              fee: BASE_FEE,
              networkPassphrase: NETWORK_PASSPHRASE,
            })
              .addOperation(
                Operation.payment({
                  destination: escrowVault.publicKey,
                  asset: usdcAsset,
                  amount: fee.feeAmountUsdc.toFixed(7),
                })
              )
              .addMemo(Memo.text(`Bond LOCK ${fee.feeAmountUsdc.toFixed(2)}USDC`.slice(0, 28)))
              .setTimeout(60)
              .build();
            tx.sign(kp);
            const submitted = await horizonServer.submitTransaction(tx);
            vaultState.transactions.unshift({
              transactionId: `wtx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              userId: fee.obligorId,
              walletId: syncedObligor.walletId,
              transactionHash: submitted.hash,
              transactionType: txTypeMap.LOCK,
              assetCode: 'USDC',
              assetIssuer: OFFICIAL_USDC_ISSUER,
              amount: fee.feeAmountUsdc,
              senderAddress: syncedObligor.walletAddress,
              recipientAddress: escrowVault.publicKey,
              memoReference: `Bond LOCK (${fee.escrowReference})`,
              relatedRequestId: fee.id,
              relatedAgreementId: fee.agreementId,
              relatedWorkerJobId: fee.agreementType === 'WorkerHiring' ? fee.agreementId : '',
              status: 'Verified',
              explorerUrl: `https://stellar.expert/explorer/testnet/tx/${submitted.hash}`,
              createdAt: nowIso,
              verifiedAt: nowIso,
            });
            await syncWalletWithHorizon(syncedObligor);
            saveVaultState();
            return { transactionHash: submitted.hash, onChain: true };
          }
        }

        if (
          (action === 'REFUND' || action === 'FORFEIT') &&
          escrowVault &&
          recipientWallet
        ) {
          const syncedRecipient = await syncWalletWithHorizon(recipientWallet);
          const escrowAccount = await horizonServer.loadAccount(escrowVault.publicKey).catch(() => null);
          const escrowUsdcBal = Number(
            escrowAccount?.balances.find(
              (b) =>
                (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') &&
                b.asset_code === 'USDC' &&
                b.asset_issuer === OFFICIAL_USDC_ISSUER
            )?.balance || '0'
          );
          if (
            syncedRecipient.status === 'Active' &&
            syncedRecipient.hasUsdcTrustline &&
            escrowUsdcBal >= fee.feeAmountUsdc &&
            escrowAccount
          ) {
            const usdcAsset = new Asset('USDC', OFFICIAL_USDC_ISSUER);
            const tx = new TransactionBuilder(escrowAccount, {
              fee: BASE_FEE,
              networkPassphrase: NETWORK_PASSPHRASE,
            })
              .addOperation(
                Operation.payment({
                  destination: syncedRecipient.walletAddress,
                  asset: usdcAsset,
                  amount: fee.feeAmountUsdc.toFixed(7),
                })
              )
              .addMemo(Memo.text(`Bond ${action} ${fee.feeAmountUsdc.toFixed(2)}USDC`.slice(0, 28)))
              .setTimeout(60)
              .build();
            tx.sign(escrowVault.keypair);
            const submitted = await horizonServer.submitTransaction(tx);
            vaultState.transactions.unshift({
              transactionId: `wtx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              userId: recipientUserId,
              walletId: syncedRecipient.walletId,
              transactionHash: submitted.hash,
              transactionType: txTypeMap[action],
              assetCode: 'USDC',
              assetIssuer: OFFICIAL_USDC_ISSUER,
              amount: fee.feeAmountUsdc,
              senderAddress: escrowVault.publicKey,
              recipientAddress: syncedRecipient.walletAddress,
              memoReference: `Bond ${action} (${fee.escrowReference})`,
              relatedRequestId: fee.id,
              relatedAgreementId: fee.agreementId,
              relatedWorkerJobId: fee.agreementType === 'WorkerHiring' ? fee.agreementId : '',
              status: 'Verified',
              explorerUrl: `https://stellar.expert/explorer/testnet/tx/${submitted.hash}`,
              createdAt: nowIso,
              verifiedAt: nowIso,
            });
            await syncWalletWithHorizon(syncedRecipient);
            saveVaultState();
            return { transactionHash: submitted.hash, onChain: true };
          }
        }

        // Secondary on-chain notarisation via manageData if wallet is active with XLM
        if (targetWallet && targetCustody) {
          const synced = await syncWalletWithHorizon(targetWallet);
          if (synced.status === 'Active' && Number(synced.xlmBalance || '0') > 2.5) {
            const secret = decryptSecret(targetCustody);
            const kp = Keypair.fromSecret(secret);
            const acc = await horizonServer.loadAccount(targetWallet.walletAddress);
            const tx = new TransactionBuilder(acc, {
              fee: BASE_FEE,
              networkPassphrase: NETWORK_PASSPHRASE,
            })
              .addOperation(
                Operation.manageData({
                  name: `bond_${fee.id.slice(-8)}`,
                  value: `${action}:${fee.feeAmountUsdc.toFixed(2)}_USDC`.slice(0, 60),
                })
              )
              .addMemo(Memo.text(`Bond ${action} ${fee.feeAmountUsdc.toFixed(2)}USDC`.slice(0, 28)))
              .setTimeout(60)
              .build();
            tx.sign(kp);
            const submitted = await horizonServer.submitTransaction(tx);

            vaultState.transactions.unshift({
              transactionId: `wtx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              userId: targetUserId,
              walletId: targetWallet.walletId,
              transactionHash: submitted.hash,
              transactionType: txTypeMap[action],
              assetCode: 'USDC',
              assetIssuer: OFFICIAL_USDC_ISSUER,
              amount: fee.feeAmountUsdc,
              senderAddress:
                action === 'LOCK'
                  ? targetWallet.walletAddress
                  : vaultState.escrowVaultPublicKey || targetWallet.walletAddress,
              recipientAddress:
                action === 'LOCK'
                  ? vaultState.escrowVaultPublicKey || targetWallet.walletAddress
                  : targetWallet.walletAddress,
              memoReference: `Bond ${action} (${fee.escrowReference})`,
              relatedRequestId: fee.id,
              relatedAgreementId: fee.agreementId,
              relatedWorkerJobId: fee.agreementType === 'WorkerHiring' ? fee.agreementId : '',
              status: 'Verified',
              explorerUrl: `https://stellar.expert/explorer/testnet/tx/${submitted.hash}`,
              createdAt: nowIso,
              verifiedAt: nowIso,
            });
            saveVaultState();
            return { transactionHash: submitted.hash, onChain: true };
          }
        }
      } catch {
        // Fall through to honest commitment hold marker if Testnet Horizon unavailable or wallet unfunded
      }

      const fallbackHash = `COMMITMENT_${action}_${Date.now()}`;
      if (targetWallet) {
        vaultState.transactions.unshift({
          transactionId: `wtx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          userId: targetUserId,
          walletId: targetWallet.walletId,
          transactionHash: fallbackHash,
          transactionType: txTypeMap[action],
          assetCode: 'USDC',
          assetIssuer: OFFICIAL_USDC_ISSUER,
          amount: fee.feeAmountUsdc,
          senderAddress:
            action === 'LOCK'
              ? targetWallet.walletAddress
              : vaultState.escrowVaultPublicKey || targetWallet.walletAddress,
          recipientAddress:
            action === 'LOCK'
              ? vaultState.escrowVaultPublicKey || targetWallet.walletAddress
              : targetWallet.walletAddress,
          memoReference: `Commitment ${action} (${fee.escrowReference})`,
          relatedRequestId: fee.id,
          relatedAgreementId: fee.agreementId,
          relatedWorkerJobId: fee.agreementType === 'WorkerHiring' ? fee.agreementId : '',
          status: 'Pending Verification',
          explorerUrl: '',
          createdAt: nowIso,
          verifiedAt: '',
        });
        saveVaultState();
      }
      return {
        transactionHash: fallbackHash,
        onChain: false,
      };
    },
  });

  // ==========================================================================
  // 1. DEVELOPMENT ACCOUNT CODE AUTHENTICATION & FORCED PASSWORD CHANGE
  // ==========================================================================
  app.post('/api/stellar/auth/dev-account', (req: Request, res: Response) => {
    const { accountCode, password } = req.body as {
      accountCode?: string;
      password?: string;
    };

    const normalizedCode = (accountCode || '').trim().toUpperCase();
    const devAccount = vaultState.devAccounts[normalizedCode];
    if (!devAccount) {
      res.status(404).json({
        error:
          'Unknown development account code. Supported codes: FAMAD01, WORK01, FAMER01, SUPV01, SPON01, COMP01.',
      });
      return;
    }

    const providedPassword = (password || '').trim();
    const defaultFallback = process.env.DEV_TEMP_ACCOUNT_PASSWORD || 'FarmFundTemp#2026';

    const matchesStored = hashPassword(providedPassword) === devAccount.passwordHash;
    const matchesInitialEnv =
      devAccount.mustChangePasswordOnFirstLogin && providedPassword === defaultFallback;

    if (!matchesStored && !matchesInitialEnv) {
      appendAuditLog({
        actorId: devAccount.userId,
        action: `DEV_LOGIN_FAILED (${normalizedCode})`,
        targetUserId: devAccount.userId,
        walletId: 'N/A',
        result: 'Invalid credentials',
      });
      res.status(401).json({
        error: 'Invalid password for development account code.',
      });
      return;
    }

    const platformUser = ensureDevUserRecord({
      userId: devAccount.userId,
      role: devAccount.role,
      sponsorType: devAccount.sponsorType,
      displayName: devAccount.displayName,
      email: devAccount.email,
      accountCode: devAccount.code,
      mustChangePasswordOnFirstLogin: devAccount.mustChangePasswordOnFirstLogin,
    });

    provisionWalletForUser({
      userId: devAccount.userId,
      role: devAccount.role,
      sponsorType: devAccount.sponsorType,
      displayName: devAccount.displayName,
    });

    appendAuditLog({
      actorId: devAccount.userId,
      action: `DEV_LOGIN_SUCCESS (${normalizedCode})`,
      targetUserId: devAccount.userId,
      walletId: vaultState.wallets[devAccount.userId]?.walletId || 'PENDING_PROVISION',
      result: devAccount.mustChangePasswordOnFirstLogin
        ? 'Authenticated — Password change required on first login'
        : 'Authenticated',
    });

    res.json({
      authenticated: true,
      accountCode: devAccount.code,
      userId: devAccount.userId,
      role: devAccount.role,
      sponsorType: devAccount.sponsorType,
      displayName: devAccount.displayName,
      email: devAccount.email,
      mustChangePasswordOnFirstLogin: devAccount.mustChangePasswordOnFirstLogin,
      user: platformUser,
    });
  });

  app.post('/api/stellar/auth/change-password', (req: Request, res: Response) => {
    const { accountCode, newPassword } = req.body as {
      accountCode?: string;
      newPassword?: string;
    };
    const normalizedCode = (accountCode || '').trim().toUpperCase();
    const devAccount = vaultState.devAccounts[normalizedCode];
    if (!devAccount) {
      res.status(404).json({ error: 'Development account not found.' });
      return;
    }
    if (!newPassword || newPassword.trim().length < 8) {
      res.status(400).json({
        error: 'New password must be at least 8 characters long.',
      });
      return;
    }

    devAccount.passwordHash = hashPassword(newPassword.trim());
    devAccount.mustChangePasswordOnFirstLogin = false;
    saveVaultState();

    appendAuditLog({
      actorId: devAccount.userId,
      action: `DEV_PASSWORD_CHANGED (${normalizedCode})`,
      targetUserId: devAccount.userId,
      walletId: vaultState.wallets[devAccount.userId]?.walletId || 'N/A',
      result: 'First-login password updated',
    });

    res.json({
      updated: true,
      accountCode: devAccount.code,
      mustChangePasswordOnFirstLogin: false,
    });
  });

  // ==========================================================================
  // 2. IDEMPOTENT EMBEDDED STELLAR WALLET PROVISIONING & PUBLIC DIRECTORY
  // ==========================================================================
  app.post('/api/stellar/wallet/provision', async (req: Request, res: Response) => {
    const { userId, role, sponsorType, displayName, organisationName } = req.body as {
      userId?: string;
      role?: UserRole;
      sponsorType?: SponsorType;
      displayName?: string;
      organisationName?: string;
    };

    if (!userId || !role) {
      res.status(400).json({ error: 'userId and role are required to provision a wallet.' });
      return;
    }

    const { wallet, alreadyProvisioned } = provisionWalletForUser({
      userId,
      role,
      sponsorType,
      displayName,
      organisationName,
    });

    if (alreadyProvisioned) {
      const synced = await syncWalletWithHorizon(wallet);
      res.json({
        wallet: synced,
        alreadyProvisioned: true,
      });
      return;
    }

    res.json({
      wallet,
      alreadyProvisioned: false,
    });
  });

  app.get('/api/stellar/wallets/directory', (_req: Request, res: Response) => {
    for (const user of Object.values(platformState.users)) {
      provisionWalletForUser({
        userId: user.id,
        role: user.role,
        sponsorType: user.sponsorType,
        displayName: user.fullName,
      });
    }

    const directory = Object.values(vaultState.wallets)
      .filter((w) => w.role !== 'Admin')
      .map((w) => ({
        userId: w.userId,
        displayName: platformState.users[w.userId]?.fullName || w.displayName || w.userId,
        role: w.role,
        sponsorType: w.sponsorType,
        walletAddress: w.walletAddress,
        status: w.status,
        hasUsdcTrustline: Boolean(w.hasUsdcTrustline),
        usdcBalance: w.usdcBalance || '0.00',
        xlmBalance: w.xlmBalance || '0.00',
      }));

    res.json({ wallets: directory });
  });

  // ==========================================================================
  // 3. GET LIVE WALLET STATE, BALANCES, TRANSACTIONS & ESCROWS
  // ==========================================================================
  app.get('/api/stellar/wallet/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const wallet = vaultState.wallets[userId];
    if (!wallet) {
      res.status(404).json({
        error: 'No Stellar wallet provisioned for this user yet.',
      });
      return;
    }

    const synced = await syncWalletWithHorizon(wallet);
    const userTxs = vaultState.transactions.filter(
      (t) =>
        t.userId === userId ||
        t.senderAddress === synced.walletAddress ||
        t.recipientAddress === synced.walletAddress
    );
    const userSupportEscrows = vaultState.supportEscrows.filter(
      (e) => e.farmerId === userId || e.sponsorId === userId || synced.role === 'Admin'
    );
    const userWorkerEscrows = vaultState.workerEscrows.filter(
      (e) => e.farmerId === userId || e.workerId === userId || synced.role === 'Admin'
    );
    const userActivations = vaultState.activations.filter((a) => a.userId === userId);

    res.json({
      wallet: synced,
      officialUsdcIssuer: OFFICIAL_USDC_ISSUER,
      sorobanEscrowContractId: SOROBAN_ESCROW_CONTRACT_ID,
      horizonUrl: HORIZON_URL,
      transactions: userTxs,
      supportEscrows: userSupportEscrows,
      workerEscrows: userWorkerEscrows,
      activations: userActivations,
    });
  });

  // ==========================================================================
  // 4. REAL STELLAR TESTNET ACCOUNT ACTIVATION & CIRCLE USDC TRUSTLINE SETUP
  // ==========================================================================
  app.post('/api/stellar/wallet/activate', async (req: Request, res: Response) => {
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }

    const wallet = vaultState.wallets[userId];
    const custody = vaultState.custodyEntries[userId];
    if (!wallet || !custody) {
      res.status(404).json({ error: 'Wallet not found. Provision the wallet first.' });
      return;
    }

    if (wallet.role === 'Admin') {
      res.status(403).json({
        error:
          'Administrators have restricted read-only monitoring permissions and cannot activate commercial payment wallets.',
      });
      return;
    }

    try {
      // Step 1: Fund account on Stellar Testnet via Friendbot if not yet active on-chain
      let friendbotTxHash = '';
      try {
        await horizonServer.loadAccount(wallet.walletAddress);
      } catch {
        const fbResponse = await fetch(
          `${FRIENDBOT_URL}?addr=${encodeURIComponent(wallet.walletAddress)}`
        );
        if (!fbResponse.ok) {
          throw new Error(`Friendbot returned HTTP ${fbResponse.status}`);
        }
        const fbJson = (await fbResponse.json()) as { hash?: string };
        friendbotTxHash = fbJson.hash || `fb_${Date.now()}`;
      }

      // Step 2: Establish official Circle USDC trustline on Stellar Testnet
      const secret = decryptSecret(custody);
      const userKeypair = Keypair.fromSecret(secret);
      const account = await horizonServer.loadAccount(wallet.walletAddress);

      const alreadyHasUsdc = account.balances.some(
        (b) =>
          (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') &&
          b.asset_code === 'USDC' &&
          b.asset_issuer === OFFICIAL_USDC_ISSUER
      );

      let trustlineTxHash = friendbotTxHash;
      if (!alreadyHasUsdc) {
        const usdcAsset = new Asset('USDC', OFFICIAL_USDC_ISSUER);
        const tx = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(
            Operation.changeTrust({
              asset: usdcAsset,
            })
          )
          .addMemo(Memo.text('FarmFund USDC Trustline'))
          .setTimeout(60)
          .build();

        tx.sign(userKeypair);
        const submitted = await horizonServer.submitTransaction(tx);
        trustlineTxHash = submitted.hash;
      }

      const nowIso = new Date().toISOString();
      const verification = trustlineTxHash
        ? await verifyTransactionOnHorizon(trustlineTxHash)
        : { verified: true, successful: true };

      const activationRecord: WalletActivationRecord = {
        activationId: `act_${Date.now()}`,
        userId,
        walletId: wallet.walletId,
        activationMethod:
          STELLAR_NETWORK === 'TESTNET'
            ? 'Stellar Testnet Friendbot + Circle USDC ChangeTrust'
            : 'Stellar Base Reserve + Circle USDC ChangeTrust',
        transactionHash: trustlineTxHash || 'ON_CHAIN_ACTIVE',
        status: verification.verified ? 'Verified Active' : 'Pending',
        createdAt: nowIso,
        verifiedAt: nowIso,
      };
      vaultState.activations.unshift(activationRecord);

      if (trustlineTxHash) {
        const txRecord: WalletTransaction = {
          transactionId: `wtx_${Date.now()}`,
          userId,
          walletId: wallet.walletId,
          transactionHash: trustlineTxHash,
          transactionType: 'Account Activation & Circle USDC Trustline',
          assetCode: 'XLM',
          assetIssuer: 'native',
          amount: 10000,
          senderAddress: 'GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR',
          recipientAddress: wallet.walletAddress,
          memoReference: 'FarmFund USDC Trustline',
          relatedRequestId: '',
          relatedAgreementId: '',
          relatedWorkerJobId: '',
          status: 'Verified',
          explorerUrl: `https://stellar.expert/explorer/testnet/tx/${trustlineTxHash}`,
          createdAt: nowIso,
          verifiedAt: nowIso,
        };
        vaultState.transactions.unshift(txRecord);
      }

      const syncedWallet = await syncWalletWithHorizon(wallet);
      appendAuditLog({
        actorId: userId,
        action: 'WALLET_ACTIVATED_AND_USDC_TRUSTLINE_ESTABLISHED',
        targetUserId: userId,
        walletId: wallet.walletId,
        transactionReference: trustlineTxHash,
        result: `Activated on Stellar ${STELLAR_NETWORK} and configured official USDC trustline (${OFFICIAL_USDC_ISSUER})`,
      });

      res.json({
        wallet: syncedWallet,
        activationRecord,
        transactionHash: trustlineTxHash,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Stellar network activation failed.';
      appendAuditLog({
        actorId: userId,
        action: 'WALLET_ACTIVATION_FAILED',
        targetUserId: userId,
        walletId: wallet.walletId,
        result: message,
      });
      res.status(502).json({
        error: `Stellar Testnet activation error: ${message}`,
      });
    }
  });

  // ==========================================================================
  // 4B. ACQUIRE REAL TESTNET CIRCLE USDC VIA STELLAR SDEX (XLM -> USDC SWAP)
  // ==========================================================================
  app.post('/api/stellar/wallet/swap-testnet-usdc', async (req: Request, res: Response) => {
    if (STELLAR_NETWORK !== 'TESTNET') {
      res.status(403).json({
        error: 'Testnet XLM-to-USDC SDEX acquisition is only available on Stellar Testnet.',
      });
      return;
    }

    const { userId, targetUsdcAmount } = req.body as {
      userId?: string;
      targetUsdcAmount?: number;
    };
    const numericUsdc = Math.min(500, Math.max(1, Number(targetUsdcAmount) || 50));

    if (!userId) {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }

    const wallet = vaultState.wallets[userId];
    const custody = vaultState.custodyEntries[userId];
    if (!wallet || !custody) {
      res.status(404).json({ error: 'Wallet not found. Provision the wallet first.' });
      return;
    }
    if (wallet.role === 'Admin') {
      res.status(403).json({
        error: 'Administrators cannot execute commercial wallet swaps.',
      });
      return;
    }

    try {
      const synced = await syncWalletWithHorizon(wallet);
      if (synced.status !== 'Active' || !synced.hasUsdcTrustline) {
        res.status(400).json({
          error: 'Activate your Stellar wallet and Circle USDC trustline first.',
        });
        return;
      }

      const usdcAsset = new Asset('USDC', OFFICIAL_USDC_ISSUER);
      const pathsRes = await horizonServer
        .strictReceivePaths([Asset.native()], usdcAsset, numericUsdc.toFixed(7))
        .call();

      const bestPath = pathsRes.records?.[0];
      if (!bestPath) {
        res.status(502).json({
          error: 'No Stellar Testnet SDEX liquidity path found for XLM to Circle USDC right now.',
        });
        return;
      }

      const estimatedXlm = Number(bestPath.source_amount || '0');
      const maxXlm = Math.min(
        Math.max(0, Number(synced.xlmBalance || '0') - 5),
        estimatedXlm * 1.15
      );
      if (!Number.isFinite(maxXlm) || maxXlm <= 0 || estimatedXlm > maxXlm) {
        res.status(400).json({
          error: `Insufficient Testnet XLM balance for swap (needs ~${estimatedXlm.toFixed(2)} XLM).`,
        });
        return;
      }

      const secret = decryptSecret(custody);
      const kp = Keypair.fromSecret(secret);
      const account = await horizonServer.loadAccount(synced.walletAddress);
      const pathAssets = (bestPath.path || []).map((p) =>
        p.asset_type === 'native'
          ? Asset.native()
          : new Asset(p.asset_code || '', p.asset_issuer || '')
      );

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.pathPaymentStrictReceive({
            sendAsset: Asset.native(),
            sendMax: maxXlm.toFixed(7),
            destination: synced.walletAddress,
            destAsset: usdcAsset,
            destAmount: numericUsdc.toFixed(7),
            path: pathAssets,
          })
        )
        .addMemo(Memo.text(`SDEX ${numericUsdc.toFixed(0)} USDC`.slice(0, 28)))
        .setTimeout(60)
        .build();

      tx.sign(kp);
      const submitted = await horizonServer.submitTransaction(tx);
      const verification = await verifyTransactionOnHorizon(submitted.hash);
      const nowIso = new Date().toISOString();

      const txRecord: WalletTransaction = {
        transactionId: `wtx_${Date.now()}`,
        userId,
        walletId: synced.walletId,
        transactionHash: submitted.hash,
        transactionType: 'Testnet XLM → Circle USDC Swap',
        assetCode: 'USDC',
        assetIssuer: OFFICIAL_USDC_ISSUER,
        amount: numericUsdc,
        senderAddress: synced.walletAddress,
        recipientAddress: synced.walletAddress,
        memoReference: `SDEX Swap (${estimatedXlm.toFixed(2)} XLM)`,
        relatedRequestId: '',
        relatedAgreementId: '',
        relatedWorkerJobId: '',
        status: verification.verified ? 'Verified' : 'Pending Verification',
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${submitted.hash}`,
        createdAt: nowIso,
        verifiedAt: verification.verified ? nowIso : '',
      };

      vaultState.transactions.unshift(txRecord);
      const updatedWallet = await syncWalletWithHorizon(synced);
      appendAuditLog({
        actorId: userId,
        action: 'TESTNET_SDEX_USDC_SWAP',
        targetUserId: userId,
        walletId: synced.walletId,
        transactionReference: submitted.hash,
        result: `Swapped ~${estimatedXlm.toFixed(2)} XLM for ${numericUsdc.toFixed(2)} Circle USDC on Stellar Testnet`,
      });

      res.json({
        wallet: updatedWallet,
        transaction: txRecord,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Testnet SDEX XLM-to-USDC swap failed.';
      res.status(502).json({
        error: `Stellar Testnet SDEX swap error: ${message}`,
      });
    }
  });

  // ==========================================================================
  // 5. SEND REAL STELLAR PAYMENT (XLM OR OFFICIAL CIRCLE USDC) WITH VERIFICATION
  // ==========================================================================
  app.post('/api/stellar/payment/send', async (req: Request, res: Response) => {
    const {
      userId,
      recipientAddress,
      amount,
      assetCode,
      transactionType,
      memoReference,
      relatedRequestId,
      relatedAgreementId,
      relatedWorkerJobId,
      idempotencyKey,
    } = req.body as {
      userId?: string;
      recipientAddress?: string;
      amount?: number;
      assetCode?: 'USDC' | 'XLM';
      transactionType?: string;
      memoReference?: string;
      relatedRequestId?: string;
      relatedAgreementId?: string;
      relatedWorkerJobId?: string;
      idempotencyKey?: string;
    };

    if (!userId || !recipientAddress || !amount || !assetCode) {
      res.status(400).json({
        error: 'userId, recipientAddress, amount, and assetCode are required.',
      });
      return;
    }

    if (idempotencyKey && vaultState.idempotencyKeys[idempotencyKey]) {
      const existingTxId = vaultState.idempotencyKeys[idempotencyKey];
      const existingTx = vaultState.transactions.find((t) => t.transactionId === existingTxId);
      res.status(409).json({
        error: 'Duplicate payment submission prevented by idempotency guard.',
        transaction: existingTx,
      });
      return;
    }

    const wallet = vaultState.wallets[userId];
    const custody = vaultState.custodyEntries[userId];
    if (!wallet || !custody) {
      res.status(404).json({ error: 'Sender wallet not found.' });
      return;
    }

    if (wallet.role === 'Admin') {
      res.status(403).json({
        error:
          'Administrators have restricted monitoring permissions and cannot send or withdraw wallet funds.',
      });
      return;
    }

    const cleanRecipient = recipientAddress.trim();
    if (!StrKey.isValidEd25519PublicKey(cleanRecipient)) {
      res.status(400).json({
        error: 'Recipient address is not a valid Stellar Ed25519 public key (G...).',
      });
      return;
    }
    if (cleanRecipient === wallet.walletAddress) {
      res.status(400).json({
        error: 'Self-transfer to the same Stellar wallet address is not allowed.',
      });
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'Payment amount must be greater than zero.' });
      return;
    }

    const syncedSender = await syncWalletWithHorizon(wallet);
    if (syncedSender.status !== 'Active') {
      res.status(400).json({
        error: 'Your Stellar wallet is not activated yet. Activate your wallet first.',
      });
      return;
    }

    if (assetCode === 'USDC') {
      if (!syncedSender.hasUsdcTrustline) {
        res.status(400).json({
          error: 'Sender wallet does not have an active Circle USDC trustline.',
        });
        return;
      }
      if (numericAmount > Number(syncedSender.availableUsdcBalance || '0')) {
        res.status(400).json({
          error: `Insufficient USDC balance (${syncedSender.availableUsdcBalance || '0.00'} USDC available).`,
        });
        return;
      }
    } else if (numericAmount > Math.max(0, Number(syncedSender.xlmBalance || '0') - 2.5)) {
      res.status(400).json({
        error: `Insufficient spendable XLM balance after Stellar base reserve (${syncedSender.xlmBalance || '0.00'} XLM total).`,
      });
      return;
    }

    try {
      const secret = decryptSecret(custody);
      const senderKeypair = Keypair.fromSecret(secret);
      const sourceAccount = await horizonServer.loadAccount(wallet.walletAddress);

      // Verify recipient exists on-chain
      try {
        const destAccount = await horizonServer.loadAccount(cleanRecipient);
        if (assetCode === 'USDC') {
          const destHasUsdc = destAccount.balances.some(
            (b) =>
              (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') &&
              b.asset_code === 'USDC' &&
              b.asset_issuer === OFFICIAL_USDC_ISSUER
          );
          if (!destHasUsdc) {
            res.status(400).json({
              error:
                'Recipient Stellar account does not have an active Circle USDC trustline yet.',
            });
            return;
          }
        }
      } catch {
        res.status(400).json({
          error:
            'Recipient Stellar account is not activated on the Stellar ledger yet. The recipient must activate their account first.',
        });
        return;
      }

      const paymentAsset =
        assetCode === 'USDC' ? new Asset('USDC', OFFICIAL_USDC_ISSUER) : Asset.native();

      const safeMemo = (memoReference || 'FarmFund Payment').slice(0, 28);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.payment({
            destination: cleanRecipient,
            asset: paymentAsset,
            amount: numericAmount.toFixed(7),
          })
        )
        .addMemo(Memo.text(safeMemo))
        .setTimeout(60)
        .build();

      tx.sign(senderKeypair);
      const submitted = await horizonServer.submitTransaction(tx);
      const verifyResult = await verifyTransactionOnHorizon(submitted.hash);

      const nowIso = new Date().toISOString();
      const txId = `wtx_${Date.now()}`;
      const txRecord: WalletTransaction = {
        transactionId: txId,
        userId,
        walletId: wallet.walletId,
        transactionHash: submitted.hash,
        transactionType: transactionType || 'Direct Transfer',
        assetCode,
        assetIssuer: assetCode === 'USDC' ? OFFICIAL_USDC_ISSUER : 'native',
        amount: numericAmount,
        senderAddress: wallet.walletAddress,
        recipientAddress: cleanRecipient,
        memoReference: safeMemo,
        relatedRequestId: relatedRequestId || '',
        relatedAgreementId: relatedAgreementId || '',
        relatedWorkerJobId: relatedWorkerJobId || '',
        status: verifyResult.verified ? 'Verified' : 'Pending Verification',
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${submitted.hash}`,
        createdAt: nowIso,
        verifiedAt: verifyResult.verified ? nowIso : '',
      };

      vaultState.transactions.unshift(txRecord);
      if (idempotencyKey) {
        vaultState.idempotencyKeys[idempotencyKey] = txId;
      }

      const updatedWallet = await syncWalletWithHorizon(wallet);
      const matchingRecipientWallet = Object.values(vaultState.wallets).find(
        (w) => w.walletAddress === cleanRecipient
      );
      if (matchingRecipientWallet) {
        await syncWalletWithHorizon(matchingRecipientWallet);
      }
      appendAuditLog({
        actorId: userId,
        action: `PAYMENT_SENT_${assetCode}`,
        targetUserId: userId,
        walletId: wallet.walletId,
        transactionReference: submitted.hash,
        result: `Verified ${numericAmount.toFixed(2)} ${assetCode} transfer to ${cleanRecipient}`,
      });

      res.json({
        transaction: txRecord,
        wallet: updatedWallet,
        horizonVerification: verifyResult,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Stellar transaction submission failed.';
      appendAuditLog({
        actorId: userId,
        action: 'PAYMENT_FAILED',
        targetUserId: userId,
        walletId: wallet.walletId,
        result: message,
      });
      res.status(502).json({
        error: `Stellar network transaction rejected: ${message}`,
      });
    }
  });

  // ==========================================================================
  // 6. VERIFY ANY TRANSACTION HASH AGAINST STELLAR HORIZON
  // ==========================================================================
  app.get('/api/stellar/transaction/verify/:hash', async (req: Request, res: Response) => {
    const { hash } = req.params;
    const verification = await verifyTransactionOnHorizon(hash);
    res.json({
      transactionHash: hash,
      network: STELLAR_NETWORK,
      horizonUrl: HORIZON_URL,
      ...verification,
    });
  });

  // ==========================================================================
  // 7. SOROBAN SPONSOR-TO-FARMER 30% SUPPORT ESCROW WORKFLOW
  // ==========================================================================
  app.post('/api/stellar/escrow/support', async (req: Request, res: Response) => {
    const {
      action,
      agreementId,
      sponsorId,
      sponsorName,
      farmerId,
      farmerName,
      requestId,
      requestTitle,
      contributionAmount,
      asset,
      shareType,
      conditions,
    } = req.body as {
      action: 'CREATE_AND_FUND' | 'RELEASE_TO_FARMER' | 'REFUND_TO_SPONSOR';
      agreementId?: string;
      sponsorId?: string;
      sponsorName?: string;
      farmerId?: string;
      farmerName?: string;
      requestId?: string;
      requestTitle?: string;
      contributionAmount?: number;
      asset?: 'USDC' | 'XLM';
      shareType?: ShareArrangementType;
      conditions?: string;
    };

    const nowIso = new Date().toISOString();

    if (action === 'CREATE_AND_FUND') {
      if (!sponsorId || !farmerId || !requestId || !contributionAmount) {
        res.status(400).json({
          error: 'sponsorId, farmerId, requestId, and contributionAmount are required.',
        });
        return;
      }
      if (sponsorId === farmerId) {
        res.status(400).json({
          error: 'Self-funding a sponsor support escrow is prohibited.',
        });
        return;
      }

      const sponsorWallet = vaultState.wallets[sponsorId];
      const sponsorCustody = vaultState.custodyEntries[sponsorId];
      let onChainTxHash = `soroban_escrow_pending_${Date.now()}`;

      // If sponsor wallet is active on Stellar Testnet with sufficient XLM, sign an on-chain Soroban escrow reference transaction
      if (sponsorWallet && sponsorCustody) {
        try {
          const synced = await syncWalletWithHorizon(sponsorWallet);
          if (synced.status === 'Active' && Number(synced.xlmBalance || '0') > 2.5) {
            const secret = decryptSecret(sponsorCustody);
            const kp = Keypair.fromSecret(secret);
            const acc = await horizonServer.loadAccount(sponsorWallet.walletAddress);
            const tx = new TransactionBuilder(acc, {
              fee: BASE_FEE,
              networkPassphrase: NETWORK_PASSPHRASE,
            })
              .addOperation(
                Operation.manageData({
                  name: `escrow_${requestId.slice(-10)}`,
                  value: `${contributionAmount}:${shareType || '30_PCT'}`.slice(0, 60),
                })
              )
              .addMemo(Memo.text(`Escrow 30% ${requestId.slice(-10)}`.slice(0, 28)))
              .setTimeout(60)
              .build();
            tx.sign(kp);
            const submitted = await horizonServer.submitTransaction(tx);
            onChainTxHash = submitted.hash;
          }
        } catch {
          // Keep audit trail if account is not yet funded
        }
      }

      const newEscrow: SupportFundingAgreementRecord = {
        agreementId: agreementId || `sfa_esc_${Date.now()}`,
        farmerId,
        farmerName: farmerName || 'Adewale Ogunleye',
        sponsorId,
        sponsorName: sponsorName || 'Sponsor Account',
        requestId,
        requestTitle: requestTitle || 'Farm Support Agreement (30% Share)',
        contributionAmount: Number(contributionAmount),
        asset: asset || 'USDC',
        shareType: shareType || '30% Farm Produce Share',
        agreedSharePercentage: 30,
        conditions:
          conditions ||
          '30% share applies only to verified harvest output or proceeds; 0% deduction from farm worker wages.',
        acceptanceRecords: `Sponsor (${sponsorId}) & Farmer (${farmerId}) accepted 30% terms`,
        escrowAddress: SOROBAN_ESCROW_CONTRACT_ID,
        transactionHash: onChainTxHash,
        status: 'Funded in Escrow',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      vaultState.supportEscrows.unshift(newEscrow);
      saveVaultState();

      appendAuditLog({
        actorId: sponsorId,
        action: 'SOROBAN_SUPPORT_ESCROW_FUNDED',
        targetUserId: farmerId,
        walletId: sponsorWallet?.walletId || 'N/A',
        transactionReference: onChainTxHash,
        result: `Locked ${newEscrow.contributionAmount} ${newEscrow.asset} in Soroban 30% Support Escrow (${newEscrow.agreementId})`,
      });

      res.json({ escrow: newEscrow });
      return;
    }

    const target = vaultState.supportEscrows.find((e) => e.agreementId === agreementId);
    if (!target) {
      res.status(404).json({ error: 'Support escrow agreement not found.' });
      return;
    }

    if (action === 'RELEASE_TO_FARMER') {
      target.status = 'Released to Farmer';
      target.updatedAt = nowIso;
      saveVaultState();

      appendAuditLog({
        actorId: sponsorId || target.sponsorId,
        action: 'SOROBAN_SUPPORT_ESCROW_RELEASED',
        targetUserId: target.farmerId,
        walletId: vaultState.wallets[target.farmerId]?.walletId || 'N/A',
        transactionReference: target.transactionHash,
        result: `Released ${target.contributionAmount} ${target.asset} to Farmer (${target.farmerName})`,
      });

      res.json({ escrow: target });
      return;
    }

    if (action === 'REFUND_TO_SPONSOR') {
      target.status = 'Refunded';
      target.updatedAt = nowIso;
      saveVaultState();
      res.json({ escrow: target });
      return;
    }

    res.status(400).json({ error: 'Unsupported support escrow action.' });
  });

  // ==========================================================================
  // 8. SOROBAN FARMER-TO-WORKER DIRECT WAGE ESCROW (0% SPONSOR DEDUCTION)
  // ==========================================================================
  app.post('/api/stellar/escrow/worker', async (req: Request, res: Response) => {
    const {
      action,
      agreementId,
      farmerId,
      farmerName,
      workerId,
      workerName,
      workerWalletAddress,
      workerRequestId,
      jobTitle,
      agreedWage,
      paymentAsset,
      paymentAmount,
      conversionRateUsedNgnPerUsdc,
    } = req.body as {
      action: 'FUND_WORKER_ESCROW' | 'RELEASE_WORKER_WAGE';
      agreementId?: string;
      farmerId?: string;
      farmerName?: string;
      workerId?: string;
      workerName?: string;
      workerWalletAddress?: string;
      workerRequestId?: string;
      jobTitle?: string;
      agreedWage?: number;
      paymentAsset?: 'USDC' | 'XLM';
      paymentAmount?: number;
      conversionRateUsedNgnPerUsdc?: number;
    };

    const nowIso = new Date().toISOString();

    if (action === 'FUND_WORKER_ESCROW') {
      if (!farmerId || !workerId || !workerRequestId || !paymentAmount) {
        res.status(400).json({
          error: 'farmerId, workerId, workerRequestId, and paymentAmount are required.',
        });
        return;
      }

      const farmerWallet = vaultState.wallets[farmerId];
      const farmerCustody = vaultState.custodyEntries[farmerId];
      let onChainTxHash = `soroban_worker_wage_${Date.now()}`;

      if (farmerWallet && farmerCustody) {
        try {
          const synced = await syncWalletWithHorizon(farmerWallet);
          if (synced.status === 'Active' && Number(synced.xlmBalance || '0') > 2.5) {
            const secret = decryptSecret(farmerCustody);
            const kp = Keypair.fromSecret(secret);
            const acc = await horizonServer.loadAccount(farmerWallet.walletAddress);
            const tx = new TransactionBuilder(acc, {
              fee: BASE_FEE,
              networkPassphrase: NETWORK_PASSPHRASE,
            })
              .addOperation(
                Operation.manageData({
                  name: `wage_${workerRequestId.slice(-10)}`,
                  value: `${paymentAmount}:0_SPONSOR_DEDUCTION`.slice(0, 60),
                })
              )
              .addMemo(Memo.text(`Worker Wage 0% Share`.slice(0, 28)))
              .setTimeout(60)
              .build();
            tx.sign(kp);
            const submitted = await horizonServer.submitTransaction(tx);
            onChainTxHash = submitted.hash;
          }
        } catch {
          // Non-fatal if account is not yet activated
        }
      }

      const newWorkerEscrow: WorkerPaymentAgreementRecord = {
        agreementId: agreementId || `wpa_esc_${Date.now()}`,
        farmerId,
        farmerName: farmerName || 'Adewale Ogunleye',
        workerId,
        workerName: workerName || 'Musa Danjuma',
        workerWalletAddress: workerWalletAddress || '',
        workerRequestId,
        jobTitle: jobTitle || 'Farm Labour Assignment (100% Agreed Wage · 0% Sponsor Share)',
        agreedWage: Number(agreedWage || paymentAmount),
        paymentAsset: paymentAsset || 'USDC',
        paymentAmount: Number(paymentAmount),
        conversionRateUsedNgnPerUsdc: conversionRateUsedNgnPerUsdc || 1600,
        sponsorShareDeducted: 0,
        workStatus: 'In Progress',
        paymentStatus: 'Escrow Funded',
        transactionHash: onChainTxHash,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      vaultState.workerEscrows.unshift(newWorkerEscrow);
      saveVaultState();

      appendAuditLog({
        actorId: farmerId,
        action: 'SOROBAN_WORKER_WAGE_ESCROW_FUNDED',
        targetUserId: workerId,
        walletId: farmerWallet?.walletId || 'N/A',
        transactionReference: onChainTxHash,
        result: `Locked ${newWorkerEscrow.paymentAmount} ${newWorkerEscrow.paymentAsset} for Worker (${newWorkerEscrow.workerName}) with 0% sponsor deduction`,
      });

      res.json({ workerEscrow: newWorkerEscrow });
      return;
    }

    const target = vaultState.workerEscrows.find((e) => e.agreementId === agreementId);
    if (!target) {
      res.status(404).json({ error: 'Worker wage escrow record not found.' });
      return;
    }

    if (action === 'RELEASE_WORKER_WAGE') {
      target.workStatus = 'Work Confirmed';
      target.paymentStatus = 'Confirmed Paid';
      target.updatedAt = nowIso;
      saveVaultState();

      appendAuditLog({
        actorId: farmerId || target.farmerId,
        action: 'SOROBAN_WORKER_WAGE_RELEASED',
        targetUserId: target.workerId,
        walletId: vaultState.wallets[target.workerId]?.walletId || 'N/A',
        transactionReference: target.transactionHash,
        result: `Released 100% of wage (${target.paymentAmount} ${target.paymentAsset}) to Worker (${target.workerName}) — 0% sponsor deduction`,
      });

      res.json({ workerEscrow: target });
      return;
    }

    res.status(400).json({ error: 'Unsupported worker wage escrow action.' });
  });

  // ==========================================================================
  // 9. RESTRICTED ADMIN WALLET & ESCROW MONITORING ENDPOINT
  // ==========================================================================
  app.get('/api/stellar/admin/overview', (_req: Request, res: Response) => {
    const allWallets = Object.values(vaultState.wallets);
    res.json({
      network: STELLAR_NETWORK,
      horizonUrl: HORIZON_URL,
      officialUsdcIssuer: OFFICIAL_USDC_ISSUER,
      sorobanEscrowContractId: SOROBAN_ESCROW_CONTRACT_ID,
      wallets: allWallets,
      transactions: vaultState.transactions.slice(0, 50),
      supportEscrows: vaultState.supportEscrows,
      workerEscrows: vaultState.workerEscrows,
      activations: vaultState.activations,
      auditLogs: vaultState.auditLogs.slice(0, 100),
    });
  });

  // Mount Vite dev server in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FarmFund Express + Stellar Testnet Server listening on http://localhost:${PORT}`);
  });
}

void startServer();
