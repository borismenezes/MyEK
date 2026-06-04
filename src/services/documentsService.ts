import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { DocumentsPayload } from '@/types';

const log = createLogger('Service/Documents');

async function fetchDocuments(employeeId: string): Promise<DocumentsPayload> {
  if (!employeeId) throw new Error('documentsService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.documents, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<DocumentsPayload>(path);
  return res.data;
}

export const documentsService = {
  fetch: fetchDocuments,
};
