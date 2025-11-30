export interface GuestClinicalMetrics {
  cdrSum: number;
  cdrMemory: number;
  cdrGlob: number;
  naccMmse: number;
}

export type GuestSessionRequest = GuestClinicalMetrics;

export interface GuestSessionResponse {
  token: string;
  expiresAt: string;
  payload: GuestClinicalMetrics;
}

export interface GuestSessionState {
  token: string;
  expiresAt: string;
  role: 'guest';
  payload: GuestClinicalMetrics;
}
