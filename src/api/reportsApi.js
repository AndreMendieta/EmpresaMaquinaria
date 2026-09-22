import client from './client';

export async function getReportsSummary() {
  return client.get('/reports/summary');
}
