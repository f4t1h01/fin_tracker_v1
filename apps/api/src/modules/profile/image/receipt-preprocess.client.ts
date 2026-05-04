import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { pipeline } from "node:stream/promises";

import type { ImageQualityIssue } from "./image-transaction-draft.schema";
import type { QrProvider } from "./image-transaction-draft.schema";

type PreprocessedReceiptImage = {
  buffer: Buffer;
  mimeType: string;
};

type ReceiptPreviewStageKey = "original" | "cleaned" | "textEnhanced";

export type ReceiptPreprocessPreviewStage = {
  key: ReceiptPreviewStageKey;
  title: string;
  description: string;
  mimeType: string;
  dataUrl: string;
  usedForExtraction: "PRIMARY" | "SECONDARY" | "NONE";
};

export type ReceiptPreprocessPayload = {
  primaryImage: PreprocessedReceiptImage;
  secondaryImage: PreprocessedReceiptImage | null;
  preprocessingApplied: string[];
  localQualityIssues: ImageQualityIssue[];
  previewStages: ReceiptPreprocessPreviewStage[];
  qrDetected: boolean;
  qrText: string | null;
  qrUrl: string | null;
  qrProvider: QrProvider | null;
  qrQualityIssues: string[];
};

type ReceiptPreprocessPreviewAsset = {
  path: string;
  mimeType: string;
};

type ReceiptPreprocessScriptOutput = {
  primaryImagePath: string;
  primaryImageMimeType: string;
  secondaryImagePath: string | null;
  secondaryImageMimeType: string | null;
  preprocessingApplied: string[];
  localQualityIssues: ImageQualityIssue[];
  qrDetected?: boolean;
  qrText?: string | null;
  qrUrl?: string | null;
  qrProvider?: QrProvider | null;
  qrQualityIssues?: string[];
  previewImages?: Partial<Record<ReceiptPreviewStageKey, ReceiptPreprocessPreviewAsset>>;
};

const supportedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const supportedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const apiPackageRoot = join(__dirname, "..", "..", "..", "..");
const previewStageMetadata: Record<
  ReceiptPreviewStageKey,
  Pick<ReceiptPreprocessPreviewStage, "title" | "description">
> = {
  original: {
    title: "Original",
    description: "Decoded upload after EXIF auto-orientation and size normalization."
  },
  cleaned: {
    title: "Cleaned",
    description: "Document cleanup after denoise, crop detection, and perspective correction."
  },
  textEnhanced: {
    title: "Text Enhanced",
    description: "High-contrast variant prepared to recover faint or low-contrast receipt text."
  }
};

function resolvePythonCommand() {
  return process.platform === "win32" ? "python" : "python3";
}

function resolveReceiptPreprocessScriptPath() {
  return join(apiPackageRoot, "scripts", "receipt_preprocess.py");
}

async function ensureReceiptPreprocessScriptExists() {
  const scriptPath = resolveReceiptPreprocessScriptPath();

  try {
    await access(scriptPath);
  } catch {
    throw new InternalServerErrorException(`API container is missing the receipt preprocessing script at ${scriptPath}`);
  }

  return scriptPath;
}

function normalizeMimeType(value: string) {
  return supportedImageMimeTypes.has(value) ? value : "application/octet-stream";
}

function resolveImageExtension(filename: string, mimetype: string) {
  const lowerName = filename.toLowerCase();
  const detectedExtension = extname(lowerName);

  if (supportedImageExtensions.has(detectedExtension)) {
    return detectedExtension;
  }

  if (supportedImageMimeTypes.has(mimetype)) {
    if (mimetype === "image/jpeg") return ".jpg";
    if (mimetype === "image/png") return ".png";
    if (mimetype === "image/webp") return ".webp";
    if (mimetype === "image/heic") return ".heic";
    if (mimetype === "image/heif") return ".heif";
  }

  throw new BadRequestException("Upload a JPG, PNG, WEBP, HEIC, or HEIF image");
}

function toDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function readPreviewStage(params: {
  key: ReceiptPreviewStageKey;
  path: string;
  mimeType: string;
  primaryImagePath: string;
  secondaryImagePath: string | null;
}): Promise<ReceiptPreprocessPreviewStage | null> {
  try {
    const buffer = await readFile(params.path);
    const metadata = previewStageMetadata[params.key];

    return {
      key: params.key,
      title: metadata.title,
      description: metadata.description,
      mimeType: params.mimeType,
      dataUrl: toDataUrl(buffer, params.mimeType),
      usedForExtraction:
        params.path === params.primaryImagePath
          ? "PRIMARY"
          : params.path === params.secondaryImagePath
            ? "SECONDARY"
            : "NONE"
    };
  } catch {
    return null;
  }
}

async function runPreprocessScript(params: {
  inputPath: string;
  outputDir: string;
  resultPath: string;
  scriptPath: string;
}) {
  const command = resolvePythonCommand();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, ["-u", params.scriptPath, "--input", params.inputPath, "--output-dir", params.outputDir, "--result-path", params.resultPath], {
      cwd: apiPackageRoot
    });

    let stderr = "";
    let stdout = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new InternalServerErrorException(`Could not start receipt preprocessing: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const details = stderr.trim() || stdout.trim();
      const lower = details.toLowerCase();
      if (lower.includes("unsupported") || lower.includes("decode") || lower.includes("cannot identify image")) {
        reject(new BadRequestException("Could not read this image. Upload a clearer JPG, PNG, WEBP, HEIC, or HEIF file."));
        return;
      }

      reject(new InternalServerErrorException(details ? `Receipt preprocessing failed: ${details}` : "Receipt preprocessing failed"));
    });
  });
}

export async function preprocessReceiptImage(file: MultipartFile): Promise<ReceiptPreprocessPayload> {
  const scriptPath = await ensureReceiptPreprocessScriptExists();
  const tempDir = await mkdtemp(join(tmpdir(), "fin-tracker-receipt-"));
  const outputDir = join(tempDir, "processed");
  const resultPath = join(tempDir, "result.json");

  try {
    const extension = resolveImageExtension(file.filename, normalizeMimeType(file.mimetype ?? ""));
    const inputPath = join(tempDir, `${randomUUID()}${extension}`);

    await mkdir(outputDir, { recursive: true });
    await pipeline(file.file, createWriteStream(inputPath));
    await runPreprocessScript({
      inputPath,
      outputDir,
      resultPath,
      scriptPath
    });

    const payload = JSON.parse(await readFile(resultPath, "utf8")) as ReceiptPreprocessScriptOutput;
    const primaryBuffer = await readFile(payload.primaryImagePath);
    const secondaryBuffer = payload.secondaryImagePath ? await readFile(payload.secondaryImagePath) : null;
    const previewStages = (
      await Promise.all([
        readPreviewStage({
          key: "original",
          path: payload.previewImages?.original?.path ?? join(outputDir, "original.jpg"),
          mimeType: payload.previewImages?.original?.mimeType ?? "image/jpeg",
          primaryImagePath: payload.primaryImagePath,
          secondaryImagePath: payload.secondaryImagePath
        }),
        readPreviewStage({
          key: "cleaned",
          path: payload.previewImages?.cleaned?.path ?? join(outputDir, "cleaned.jpg"),
          mimeType: payload.previewImages?.cleaned?.mimeType ?? "image/jpeg",
          primaryImagePath: payload.primaryImagePath,
          secondaryImagePath: payload.secondaryImagePath
        }),
        readPreviewStage({
          key: "textEnhanced",
          path: payload.previewImages?.textEnhanced?.path ?? join(outputDir, "text_enhanced.png"),
          mimeType: payload.previewImages?.textEnhanced?.mimeType ?? "image/png",
          primaryImagePath: payload.primaryImagePath,
          secondaryImagePath: payload.secondaryImagePath
        })
      ])
    ).filter((stage): stage is ReceiptPreprocessPreviewStage => stage !== null);

    return {
      primaryImage: {
        buffer: primaryBuffer,
        mimeType: payload.primaryImageMimeType
      },
      secondaryImage: secondaryBuffer && payload.secondaryImageMimeType
        ? {
            buffer: secondaryBuffer,
            mimeType: payload.secondaryImageMimeType
          }
        : null,
      preprocessingApplied: Array.isArray(payload.preprocessingApplied) ? payload.preprocessingApplied.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [],
      localQualityIssues: Array.isArray(payload.localQualityIssues) ? payload.localQualityIssues.filter((item): item is ImageQualityIssue => typeof item === "string") : [],
      previewStages,
      qrDetected: Boolean(payload.qrDetected),
      qrText: typeof payload.qrText === "string" && payload.qrText.trim() ? payload.qrText.trim() : null,
      qrUrl: typeof payload.qrUrl === "string" && payload.qrUrl.trim() ? payload.qrUrl.trim() : null,
      qrProvider: payload.qrProvider === "SOLIQ_OFD" || payload.qrProvider === "UNKNOWN" ? payload.qrProvider : null,
      qrQualityIssues: Array.isArray(payload.qrQualityIssues) ? payload.qrQualityIssues.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
    };
  } catch (error) {
    if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
      throw error;
    }

    throw new InternalServerErrorException(error instanceof Error ? error.message : "Receipt preprocessing failed");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
