import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRemoteRspackConfig } from '@myek/sdk/rspack/remote-config';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default buildRemoteRspackConfig({ appsDir: __dirname, serviceId: 'business-card', mfName: 'business_card', uniqueName: 'myek-business-card' });
