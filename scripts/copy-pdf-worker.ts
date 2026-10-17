import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

import { PDF_WORKER_PATH } from "../src/lib/pdf/constants/pdf";

copyFileSync(
  resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  resolve("public", PDF_WORKER_PATH.slice(1)),
);
