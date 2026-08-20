type OtpRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
};

const otpByPhone = new Map<string, OtpRecord>();

export function issueCustomerOtp(phone: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpByPhone.set(phone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  });
  return code;
}

export function consumeCustomerOtp(phone: string, code: string) {
  const row = otpByPhone.get(phone);
  if (!row) return "Kode OTP belum dikirim. Ketuk Daftar lagi.";
  if (Date.now() > row.expiresAt) {
    otpByPhone.delete(phone);
    return "Kode OTP kedaluwarsa. Kirim ulang.";
  }
  row.attempts += 1;
  if (row.attempts > 5) {
    otpByPhone.delete(phone);
    return "Terlalu banyak percobaan. Kirim ulang kode.";
  }
  if (String(code || "").trim() !== row.code) {
    return "Kode OTP tidak sesuai.";
  }
  otpByPhone.delete(phone);
  return null;
}

export function phoneToWaIntl(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}
