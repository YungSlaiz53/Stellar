import heroHarvestImg from '../assets/images/hero_nigerian_farm_harvest_1794858524038.jpg';
import supportMechanizationImg from '../assets/images/support_cassava_mechanization_1794858525748.jpg';
import workersHarvestImg from '../assets/images/workers_harvest_team_1794858526226.jpg';
import farmerAvatarImg from '../assets/images/avatar_farmer_adewale_1794858526555.jpg';
import supervisorInspectionImg from '../assets/images/agronomist_supervisor_inspection_1795022320166.jpg';
import sponsorPartnershipImg from '../assets/images/sponsor_agribusiness_partnership_1795022320031.jpg';
import type {
  DirectMessage,
  DisputeRecord,
  SponsorFundingAgreement,
  SupportRequest,
  WorkerAgreement,
  WorkerApplication,
  WorkerPayment,
  WorkerProfile,
  WorkerRequest,
} from '../types/farmfund';

export const ASSETS = {
  heroHarvest: heroHarvestImg,
  supportProject: supportMechanizationImg,
  workersHarvest: workersHarvestImg,
  farmerAvatar: farmerAvatarImg,
  supervisorInspection: supervisorInspectionImg,
  sponsorPartnership: sponsorPartnershipImg,
};

// Strictly empty initial operational datasets — never fabricate fake farmers,
// workers, sponsors, supervisors, jobs, transactions, messages or statistics.
export const INITIAL_SUPPORT_REQUESTS: SupportRequest[] = [];
export const INITIAL_SPONSOR_AGREEMENTS: SponsorFundingAgreement[] = [];
export const INITIAL_WORKER_REQUESTS: WorkerRequest[] = [];
export const INITIAL_WORKER_PROFILES: WorkerProfile[] = [];
export const INITIAL_WORKER_APPLICATIONS: WorkerApplication[] = [];
export const INITIAL_WORKER_AGREEMENTS: WorkerAgreement[] = [];
export const INITIAL_WORKER_PAYMENTS: WorkerPayment[] = [];
export const INITIAL_MESSAGES: DirectMessage[] = [];
export const INITIAL_DISPUTES: DisputeRecord[] = [];
