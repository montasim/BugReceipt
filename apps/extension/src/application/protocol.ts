import {
  runtimeResponseSchema,
  type RuntimeRequest,
  type RuntimeResponse,
} from '@bugreceipt/capture-model';

export async function sendRuntimeMessage(request: RuntimeRequest): Promise<RuntimeResponse> {
  return runtimeResponseSchema.parse(await chrome.runtime.sendMessage(request));
}
