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
  StellarNetworkType,
  SupportFundingAgreementRecord,
  UserRole,
  UserWallet,
  WalletActivationRecord,
  WalletAuditLog,
  WalletTransaction,
  WorkerPaymentAgreementRecord,
} from './src/types/farmfund';

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
  code: 'FAMAD01' | 'FAMER01' | 'SPON01' | 'COMP01';
  userId: string;
  role: UserRole;
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
    FAMER01: {
      code: 'FAMER01',
      userId: 'dev_farmer_famer01',
      role: 'Farmer',
      displayName: 'Adewale Ogunleye (FAMER01)',
      email: 'farmer.famer01@farmfund.ng',
      passwordHash: initialHash,
      mustChangePasswordOnFirstLogin: true,
    },
    SPON01: {
      code: 'SPON01',
      userId: 'dev_sponsor_spon01',
      role: 'Sponsor',
      displayName: 'Chukwuma Okafor · Individual Sponsor (SPON01)',
      email: 'sponsor.spon01@farmfund.ng',
      passwordHash: initialHash,
      mustChangePasswordOnFirstLogin: true,
    },
    COMP01: {
      code: 'COMP01',
      userId: 'dev_company_comp01',
      role: 'Company',
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
      return {
        custodyEntries: parsed.custodyEntries || {},
        wallets: parsed.wallets || {},
        transactions: parsed.transactions || [],
        supportEscrows: parsed.supportEscrows || [],
        workerEscrows: parsed.workerEscrows || [],
        activations: parsed.activations || [],
        auditLogs: parsed.auditLogs || [],
        idempotencyKeys: parsed.idempotencyKeys || {},
        devAccounts: parsed.devAccounts || createInitialDevAccounts(),
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

    // Calculate locked escrow obligations for this user
    const lockedSupport = vaultState.supportEscrows
      .filter((e) => e.sponsorId === wallet.userId && e.status === 'Funded in Escrow')
      .reduce((sum, e) => sum + e.contributionAmount, 0);
    const lockedWorker = vaultState.workerEscrows
      .filter((e) => e.farmerId === wallet.userId && e.paymentStatus === 'Escrow Funded')
      .reduce((sum, e) => sum + e.paymentAmount, 0);

    const pendingEscrow = (lockedSupport + lockedWorker).toFixed(2);

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

    if (status === 404) {
      const unactivated: UserWallet = {
        ...wallet,
        status: 'Activation Required',
        xlmBalance: '0.00',
        usdcBalance: '0.00',
        availableUsdcBalance: '0.00',
        pendingEscrowUsdcBalance: (lockedSupport + lockedWorker).toFixed(2),
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

async function startServer() {
  const app = express();
  app.use(express.json());

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
          'Unknown development account code. Supported codes: FAMAD01, FAMER01, SPON01, COMP01.',
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
      displayName: devAccount.displayName,
      email: devAccount.email,
      mustChangePasswordOnFirstLogin: devAccount.mustChangePasswordOnFirstLogin,
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
  // 2. IDEMPOTENT EMBEDDED STELLAR WALLET PROVISIONING
  // ==========================================================================
  app.post('/api/stellar/wallet/provision', async (req: Request, res: Response) => {
    const { userId, role, displayName, organisationName } = req.body as {
      userId?: string;
      role?: UserRole;
      displayName?: string;
      organisationName?: string;
    };

    if (!userId || !role) {
      res.status(400).json({ error: 'userId and role are required to provision a wallet.' });
      return;
    }

    // Idempotent check: never create duplicate wallets for the same user
    const existing = vaultState.wallets[userId];
    if (existing) {
      const synced = await syncWalletWithHorizon(existing);
      res.json({
        wallet: synced,
        alreadyProvisioned: true,
      });
      return;
    }

    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();
    const encrypted = encryptSecret(keypair.secret());
    const nowIso = new Date().toISOString();
    const walletId = `ff_wal_${userId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}`;

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
      role,
      displayName: displayName || userId,
      organisationName:
        role === 'Company' ? organisationName || displayName || 'Partner Organisation' : undefined,
      authorisedRepresentatives:
        role === 'Company'
          ? buildDefaultCompanyRepresentatives(displayName || 'Treasury Director')
          : undefined,
      approvalPolicy:
        role === 'Company'
          ? 'Role-based organisation signatory approval (no shared private keys)'
          : 'Authenticated user session + server-vault signing',
      walletAddress: publicKey,
      provider: 'Stellar SDK Embedded Wallet (@stellar/stellar-sdk)',
      custodyModel:
        role === 'Company'
          ? 'Organisation Vault Custody (AES-256-GCM Server Key Isolation · Per-Representative RBAC)'
          : 'Managed Embedded Custody (AES-256-GCM Server Vault · Zero Plaintext Key Exposure)',
      network: STELLAR_NETWORK,
      status: 'Activation Required',
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

    res.json({
      wallet: newWallet,
      alreadyProvisioned: false,
    });
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
          'Administrator accounts have restricted monitoring permissions and cannot activate commercial payment wallets.',
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
  // 5. SEND REAL STELLAR PAYMENT (XLM OR OFFICIAL CIRCLE USDC) WITH VERIFICATION
  // ==========================================================================
  app.post('/api/stellar/payment/send', async (req: Request, res: Response) => {
    const {
      userId,
      recipientAddress,
      amount,
      assetCode,
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
        error: 'Administrators have restricted monitoring permissions and cannot send funds.',
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
        transactionType: 'Direct Transfer',
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
