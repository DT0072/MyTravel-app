import { AppLanguage } from '../../services/accessibility-preferences.service';

export interface MyKadValidationResult {
  valid: boolean;
  formatted: string;
  masked: string;
  dobIso?: string;
  dobDisplay?: string;
  age?: number;
  birthState?: string;
  pbCode?: string;
  gender?: Record<AppLanguage, string>;
  error?: Record<AppLanguage, string>;
}

export interface PassportValidationResult {
  valid: boolean;
  formatted: string;
  masked: string;
  error?: Record<AppLanguage, string>;
}

const JPN_STATE_CODES: Record<string, string> = {
  '01': 'Johor', '21': 'Johor', '22': 'Johor', '23': 'Johor', '24': 'Johor',
  '02': 'Kedah', '25': 'Kedah', '26': 'Kedah', '27': 'Kedah',
  '03': 'Kelantan', '28': 'Kelantan', '29': 'Kelantan',
  '04': 'Melaka', '30': 'Melaka',
  '05': 'Negeri Sembilan', '31': 'Negeri Sembilan', '59': 'Negeri Sembilan',
  '06': 'Pahang', '32': 'Pahang', '33': 'Pahang',
  '07': 'Penang', '34': 'Penang', '35': 'Penang',
  '08': 'Perak', '36': 'Perak', '37': 'Perak', '38': 'Perak', '39': 'Perak',
  '09': 'Perlis', '40': 'Perlis',
  '10': 'Selangor', '41': 'Selangor', '42': 'Selangor', '43': 'Selangor', '44': 'Selangor',
  '11': 'Terengganu', '45': 'Terengganu', '46': 'Terengganu',
  '12': 'Sabah', '47': 'Sabah', '48': 'Sabah', '49': 'Sabah',
  '13': 'Sarawak', '50': 'Sarawak', '51': 'Sarawak', '52': 'Sarawak', '53': 'Sarawak',
  '14': 'Kuala Lumpur', '54': 'Kuala Lumpur', '55': 'Kuala Lumpur', '56': 'Kuala Lumpur', '57': 'Kuala Lumpur',
  '15': 'Labuan', '58': 'Labuan',
  '16': 'Putrajaya',
};

function resolveJpnBirthState(pbCode: string): string | null {
  if (JPN_STATE_CODES[pbCode]) {
    return JPN_STATE_CODES[pbCode];
  }
  const num = Number.parseInt(pbCode, 10);
  if ((num >= 60 && num <= 89) || num === 98 || num === 99) {
    return 'Overseas (Malaysian Citizen)';
  }
  return null;
}

export function formatMyKadInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (digits.length <= 6) {
    return digits;
  }
  if (digits.length <= 8) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

export function validateMalaysianMyKad(raw: string): MyKadValidationResult {
  const digits = raw.replace(/\D/g, '');
  const formatted = formatMyKadInput(digits);

  if (digits.length !== 12) {
    return {
      valid: false,
      formatted,
      masked: '',
      error: {
        EN: 'MyKad must contain exactly 12 digits in YYMMDD-PB-#### format.',
        BM: 'MyKad mestilah mengandungi tepat 12 digit dalam format TTBBHH-PB-####.',
      },
    };
  }

  // Reject trivial repeating digits (e.g. 111111111111)
  if (/^(\d)\1{11}$/.test(digits)) {
    return {
      valid: false,
      formatted,
      masked: '',
      error: {
        EN: 'Invalid MyKad number sequence.',
        BM: 'Urutan nombor MyKad tidak sah.',
      },
    };
  }

  const yy = Number.parseInt(digits.slice(0, 2), 10);
  const mm = Number.parseInt(digits.slice(2, 4), 10);
  const dd = Number.parseInt(digits.slice(4, 6), 10);
  const pbCode = digits.slice(6, 8);
  const serial = digits.slice(8, 12);

  const now = new Date();
  const currentYear = now.getFullYear();
  const cutoffYY = currentYear % 100;
  const fullYear = yy <= cutoffYY ? 2000 + yy : 1900 + yy;

  if (mm < 1 || mm > 12) {
    return {
      valid: false,
      formatted,
      masked: '',
      error: {
        EN: `Invalid birth month (${digits.slice(2, 4)}) in MyKad first 6 digits.`,
        BM: `Bulan kelahiran tidak sah (${digits.slice(2, 4)}) dalam 6 digit pertama MyKad.`,
      },
    };
  }

  const daysInMonth = new Date(fullYear, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) {
    return {
      valid: false,
      formatted,
      masked: '',
      error: {
        EN: `Invalid birth day (${digits.slice(4, 6)}) for ${fullYear}-${String(mm).padStart(2, '0')}.`,
        BM: `Hari kelahiran tidak sah (${digits.slice(4, 6)}) bagi ${fullYear}-${String(mm).padStart(2, '0')}.`,
      },
    };
  }

  if (serial === '0000') {
    return {
      valid: false,
      formatted,
      masked: '',
      error: {
        EN: 'Invalid MyKad serial number (last 4 digits cannot be 0000).',
        BM: 'Nombor siri MyKad tidak sah (4 digit terakhir tidak boleh 0000).',
      },
    };
  }

  const age = currentYear - fullYear;
  if (age < 12 || age > 110) {
    return {
      valid: false,
      formatted,
      masked: '',
      error: {
        EN: 'Holder must be at least 12 years old with a valid MyKad.',
        BM: 'Pemegang mestilah berumur sekurang-kurangnya 12 tahun dengan MyKad yang sah.',
      },
    };
  }

  const birthState = resolveJpnBirthState(pbCode);
  if (!birthState) {
    return {
      valid: false,
      formatted,
      masked: '',
      error: {
        EN: `Unrecognised JPN state/place-of-birth code (${pbCode}).`,
        BM: `Kod negeri kelahiran JPN (${pbCode}) tidak diiktiraf.`,
      },
    };
  }

  const lastDigit = Number.parseInt(digits[11], 10);
  const gender = lastDigit % 2 === 1
    ? { EN: 'Male', BM: 'Lelaki' }
    : { EN: 'Female', BM: 'Perempuan' };

  const dobDate = new Date(fullYear, mm - 1, dd);
  const dobDisplay = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dobDate);

  return {
    valid: true,
    formatted,
    masked: `${digits.slice(0, 6)}-${pbCode}-****`,
    dobIso: `${fullYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
    dobDisplay,
    age,
    birthState,
    pbCode,
    gender,
  };
}

export function validateInternationalPassport(raw: string): PassportValidationResult {
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]+/g, '');
  if (!/^[A-Z0-9]{6,12}$/.test(cleaned) || (cleaned.match(/\d/g)?.length ?? 0) < 4 || /^(.)\1+$/.test(cleaned)) {
    return {
      valid: false,
      formatted: cleaned,
      masked: '',
      error: {
        EN: 'Enter a valid ICAO passport number (6–12 alphanumeric characters with at least 4 digits, e.g. A12345678).',
        BM: 'Masukkan nombor pasport ICAO yang sah (6–12 aksara abjad angka dengan sekurang-kurangnya 4 digit, cth. A12345678).',
      },
    };
  }

  const visiblePrefix = cleaned.slice(0, 2);
  const visibleSuffix = cleaned.slice(-2);
  const masked = `${visiblePrefix}${'*'.repeat(Math.max(3, cleaned.length - 4))}${visibleSuffix}`;

  return {
    valid: true,
    formatted: cleaned,
    masked,
  };
}
