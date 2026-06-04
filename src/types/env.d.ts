declare module '@env' {
  export const API_BASE_URL: string;
  export const API_DEFAULT_VERSION: string;
  export const API_TIMEOUT_MS: string;
  export const API_MAX_RETRIES: string;
  export const INTUNE_TENANT_ID: string;
  export const INTUNE_CLIENT_ID: string;
  export const INTUNE_REDIRECT_URI: string;
  export const INTUNE_SCOPE: string;
  export const APIM_BASE_URL: string;
  export const APIM_SUBSCRIPTION_KEY: string;
  export const API_SCOPE: string;
  // APIM path templates — `{employeeId}` is substituted at call time.
  export const APIM_PATH_LEAVE: string;
  export const APIM_PATH_BUSINESS_CARD: string;
  export const APIM_PATH_APPRECIATIONS: string;
  export const APIM_PATH_ATTENDANCE: string;
  export const APIM_PATH_PAYSLIP: string;
  export const APIM_PATH_ROSTER: string;
  export const APIM_PATH_TIMESHEET: string;
  export const APIM_PATH_MY_TRIPS: string;
  export const APIM_PATH_EVENTS: string;
  export const APIM_PATH_PROFILE_PICTURE: string;
  export const APIM_PATH_APPLICATIONS_MANIFEST: string;
  export const APIM_PATH_DOCUMENTS: string;
  export const APIM_PATH_LEAVE_DETAILS: string;
  export const APIM_PATH_PLATINUM_VOUCHERS: string;
  export const APIM_PATH_ATTENDANCE_DETAILS: string;
  export const APIM_PATH_USER_PROFILE: string;
  export const APIM_PATH_TIMESHEET_DETAILS: string;
  export const APIM_PATH_MY_PAYSLIP: string;
  export const APIM_PATH_PLATINUM_CARD: string;
  export const LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  export const LOG_REMOTE_ENABLED: string;
}
