export const types = {allFiles: '*/*', pdf: 'application/pdf', images: 'image/*'};
export const errorCodes = {OPERATION_CANCELED: 'OPERATION_CANCELED'};
export const isErrorWithCode = jest.fn(() => false);
export const pick = jest.fn(async () => []);
