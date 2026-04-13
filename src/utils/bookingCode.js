const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateBookingCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}
