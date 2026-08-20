import { createWorker } from "tesseract.js";

export type KtpParsed = {
  nik: string;
  fullName: string;
  placeOfBirth: string;
  dateOfBirth: string;
  address: string;
  gender: string;
  religion: string;
};

export type KtpOcrResult = KtpParsed & {
  rawText: string;
  confidence: number;
  provider: "TESSERACT" | "MANUAL";
  note: string | null;
};

export function decodeImageBuffer(raw: unknown): Buffer | null {
  const s = String(raw ?? "").trim();
  const match = s.match(/^data:image\/[a-z0-9.+-]+(?:;[^,]*)*;base64,(.+)$/i);
  if (!match) return null;
  return Buffer.from(match[1].replace(/\s/g, ""), "base64");
}

export function normalizeName(value: string) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNik(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export function parseKtpText(text: string): KtpParsed {
  const raw = String(text || "");
  const upper = raw.toUpperCase();
  const compact = upper.replace(/\s+/g, " ").trim();

  let nik = "";
  const nikFromLabel =
    upper.match(/NIK\s*[:\.\-\u00A0]?\s*(\d[\d\s\.\u00A0\-]{14,19}\d)/i) ||
    upper.match(/N\s*I\s*K\s*[:\.\-\u00A0]?\s*(\d[\d\s\.\u00A0\-]{14,19}\d)/i) ||
    // Kadang OCR salah baca "NIK" → coba cari varian sederhana.
    upper.match(/N1K\s*[:\.\-\u00A0]?\s*(\d[\d\s\.\u00A0\-]{14,19}\d)/i);
  if (nikFromLabel?.[1]) {
    nik = normalizeNik(nikFromLabel[1]);
  } else {
    // OCR sering memisahkan digit NIK dengan spasi/dot.
    // Ambil kandidat angka 16 digit (atau lebih) dan normalize.
    const digitCandidates = Array.from(
      raw.matchAll(/(\d[\d\s\.]{14,19}\d)/g)
    )
      .map((m) => normalizeNik(m[1]))
      .filter((d) => d.length >= 16);

    // Prefer yang panjangnya paling dekat 16 digit.
    digitCandidates.sort(
      (a, b) => Math.abs(a.length - 16) - Math.abs(b.length - 16)
    );
    if (digitCandidates[0]) nik = digitCandidates[0].slice(0, 16);

    // Fallback: jika OCR sama sekali tidak menemukan kandidat 16-digit,
    // ambil semua digit dari teks lalu cari subsekuens 16 digit.
    if (!nik) {
      const digitsOnly = upper.replace(/\D/g, "");
      if (digitsOnly.length >= 16) {
        // Ambil subsekuens yang pertama untuk cepat; ini biasanya cukup untuk KTP.
        nik = digitsOnly.slice(0, 16);
      }
    }
  }

  let fullName = "";
  const nameFromLabel =
    upper.match(/(?:NAMA|NAME)\s*[:\.\-]?\s*([A-Z\s.'-]{6,})/i);
  if (nameFromLabel?.[1]) {
    fullName = nameFromLabel[1].replace(/\s+/g, " ").trim();
  } else {
    const lines = upper
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const banned = [
      "NIK",
      "TEMPAT",
      "TGL",
      "TTL",
      "ALAMAT",
      "ADDRESS",
      "RT/RW",
      "RT/R W",
      "KEL",
      "DESA",
      "KECAMATAN",
      "KOTA",
      "PROVINSI",
      "AGAMA",
      "JENIS",
      "KELAMIN",
      "BELUM",
      "KOSONG",
      "TIDAK",
      "ADA",
    ];

    // Cari baris yang paling “mirip nama”: banyak huruf, tidak ada angka, tidak berisi label.
    const candidates = lines
      .filter((l) => !/\d/.test(l))
      .filter((l) => /[A-Z]{3,}/.test(l))
      .filter((l) => l.length >= 7 && l.length <= 60)
      .filter((l) => !banned.some((b) => l.includes(b)));

    // Additional guard: nama KTP biasanya minimal 2 kata dan setiap kata >= 2 huruf.
    const cleanedCandidates = candidates.filter((c) => {
      const words = c
        .replace(/[^A-Z\s.'-]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
      if (words.length < 2) return false;
      if (words.some((w) => w.length < 2)) return false;
      return true;
    });

    cleanedCandidates.sort((a, b) => b.length - a.length);
    if (cleanedCandidates[0])
      fullName = cleanedCandidates[0].replace(/\s+/g, " ").trim();
  }

  let placeOfBirth = "";
  let dateOfBirth = "";
  const ttlMatch = upper.match(
    /(?:TEMPAT\/TGL\s*LAHIR|TEMPAT TGL LAHIR|TTL)\s*[:\.]?\s*([^,\n]+?)\s*,\s*(\d{2}[-/.]\d{2}[-/.]\d{4}|\d{2}-\d{2}-\d{2})/
  );
  if (ttlMatch) {
    placeOfBirth = ttlMatch[1].replace(/\s+/g, " ").trim();
    dateOfBirth = ttlMatch[2].replace(/\//g, "-");
  }

  let address = "";
  const addrMatch = upper.match(/(?:ALAMAT|ADDRESS)\s*[:\.]?\s*(.+?)(?:\n|RT\/RW|KEL\/DESA|$)/);
  if (addrMatch) {
    address = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  let gender = "";
  const genderMatch = upper.match(
    /(?:JENIS\s*KELAMIN|KELAMIN)\s*[:\.]?\s*(LAKI-LAKI|PEREMPUAN|LAKI LAKI)/i
  );
  if (genderMatch) gender = genderMatch[1].replace(/\s+/g, "-").toUpperCase();

  let religion = "";
  const religionMatch = upper.match(
    /(?:AGAMA)\s*[:\.]?\s*(ISLAM|KRISTEN|KATOLIK|HINDU|BUDDHA|KHONGHUCU|PROTESTAN)/i
  );
  if (religionMatch) religion = religionMatch[1].toUpperCase();

  return {
    nik,
    fullName,
    placeOfBirth,
    dateOfBirth,
    address,
    gender,
    religion,
  };
}

export function compareKtpFields(
  entered: { fullName?: string; nik?: string },
  ocr: KtpParsed
): string[] {
  const mismatches: string[] = [];
  const enteredName = normalizeName(entered.fullName || "");
  const ocrName = normalizeName(ocr.fullName || "");
  if (ocrName && enteredName && enteredName !== ocrName) {
    mismatches.push("fullName");
  }
  const enteredNik = normalizeNik(entered.nik || "");
  const ocrNik = normalizeNik(ocr.nik || "");
  if (ocrNik && enteredNik && enteredNik !== ocrNik) {
    mismatches.push("nik");
  }
  return mismatches;
}

const emptyParsed = (): KtpParsed => ({
  nik: "",
  fullName: "",
  placeOfBirth: "",
  dateOfBirth: "",
  address: "",
  gender: "",
  religion: "",
});

export async function readKtpFromImage(raw: unknown): Promise<KtpOcrResult> {
  const buf = decodeImageBuffer(raw);
  if (!buf) {
    return {
      ...emptyParsed(),
      rawText: "",
      confidence: 0,
      provider: "MANUAL",
      note: "Foto KTP tidak terbaca. Isi data manual untuk verifikasi.",
    };
  }

  try {
    const worker = await createWorker("ind+eng", 1, {
      logger: () => undefined,
    });
    const { data } = await worker.recognize(buf);
    await worker.terminate();
    const parsed = parseKtpText(data.text || "");
    const confidence = Number(data.confidence || 0) / 100;
    const hasData = Boolean(parsed.nik || parsed.fullName);
    return {
      ...parsed,
      rawText: data.text || "",
      confidence,
      provider: "TESSERACT",
      note: hasData
        ? confidence < 0.45
          ? "Hasil OCR kurang jelas — periksa dan koreksi data di bawah."
          : null
        : "OCR tidak menemukan NIK/nama — isi manual sesuai KTP.",
    };
  } catch {
    return {
      ...emptyParsed(),
      rawText: "",
      confidence: 0,
      provider: "MANUAL",
      note: "OCR sementara gagal. Isi NIK dan nama sesuai KTP secara manual.",
    };
  }
}
