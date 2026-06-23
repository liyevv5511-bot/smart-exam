import multer from 'multer';

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 10);

const ALLOWED = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/pdf', // .pdf
  'application/octet-stream',
];

/** Excel/PDF faylları yaddaşda saxlanılır (diskə yazılmır). */
export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okExt = /\.(xlsx|xls|pdf)$/i.test(file.originalname);
    if (ALLOWED.includes(file.mimetype) || okExt) cb(null, true);
    else cb(new Error('Yalnız .xlsx / .xls / .pdf faylları qəbul edilir.'));
  },
}).single('file');
