// Twilio integration has been disabled by user request in favor of direct WhatsApp click-to-chat links.
export interface TwilioSendParams {
  to: string;
  body: string;
}

export async function sendTwilioMessage({ to, body }: TwilioSendParams) {
  console.log('Twilio is disabled. Opening WhatsApp direct link instead.', { to, body });
  return { success: true, sid: 'mock_disabled', status: 'disabled', to };
}
