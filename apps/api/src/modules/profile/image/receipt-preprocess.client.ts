import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { pipeline } from "node:stream/promises";

import type { ImageQualityIssue } from "./image-transaction-draft.schema";

type PreprocessedReceiptImage = {
  buffer: Buffer;
  mimeType: string;
};

type ReceiptPreprocessPayload = {
  primaryImage: PreprocessedReceiptImage;
  secondaryImage: PreprocessedReceiptImage | null;
  preprocessingApplied: string[];
  localQualityIssues: ImageQualityIssue[];
};

type ReceiptPreprocessScriptOutput = {
  primaryImagePath: string;
  primaryImageMimeType: string;
  secondaryImagePath: string | null;
  secondaryImageMimeType: string | null;
  preprocessingApplied: string[];
  localQualityIssues: ImageQualityIssue[];
};

const supportedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const supportedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function resolvePythonCommand() {
  return process.platform === "win32" ? "python" : "python3";
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

async function runPreprocessScript(params: {
  inputPath: string;
  outputDir: string;
  resultPath: string;
}) {
  const scriptPath = join(process.cwd(), "apps", "api", "scripts", "receipt_preprocess.py");
  const command = resolvePythonCommand();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, ["-u", scriptPath, "--input", params.inputPath, "--output-dir", params.outputDir, "--result-path", params.resultPath], {
      cwd: process.cwd()
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
      resultPath
    });

    const payload = JSON.parse(await readFile(resultPath, "utf8")) as ReceiptPreprocessScriptOutput;
    const primaryBuffer = await readFile(payload.primaryImagePath);
    const secondaryBuffer = payload.secondaryImagePath ? await readFile(payload.secondaryImagePath) : null;

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
      localQualityIssues: Array.isArray(payload.localQualityIssues) ? payload.localQualityIssues.filter((item): item is ImageQualityIssue => typeof item === "string") : []
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
