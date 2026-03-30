import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";

import { ProfileService } from "../profile.service";
import { extractVoiceTransactionDraft } from "./openai-extraction.client";
import { transcribeVoiceAudio } from "./openai-transcription.client";
import { matchVoiceCategory, type VoiceCategoryCatalog } from "./voice-category-matcher";
import type { VoiceTransactionDraftResponse } from "./voice-transaction-draft.schema";

@Injectable()
export class ProfileVoiceService {
  private readonly openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? null;

  constructor(private readonly profileService: ProfileService) {}

  async createDraft(userId: string, file: MultipartFile): Promise<VoiceTransactionDraftResponse> {
    if (!this.openAiApiKey) {
      throw new ServiceUnavailableException("Voice drafting is not configured on this server");
    }

    if (!file) {
      throw new BadRequestException("Upload a voice recording first");
    }

    const transcript = await transcribeVoiceAudio({
      apiKey: this.openAiApiKey,
      file
    });

    const catalog = (await this.profileService.getManagedCategories(userId)) as VoiceCategoryCatalog;
    const extracted = await extractVoiceTransactionDraft({
      apiKey: this.openAiApiKey,
      transcript,
      catalog
    });

    const matchedCategory = matchVoiceCategory({
      catalog,
      kind: extracted.kind,
      categoryName: extracted.categoryName
    });

    const missingFields = new Set<string>(extracted.missingFields);
    if (!extracted.kind) {
      missingFields.add("kind");
    }
    if (typeof extracted.amount !== "number") {
      missingFields.add("amount");
    }
    if (!extracted.currency) {
      missingFields.add("currency");
    }
    if (!matchedCategory.categoryId) {
      missingFields.add("category");
    } else {
      missingFields.delete("category");
    }

    const warnings = [...extracted.warnings];
    if (!matchedCategory.categoryId) {
      warnings.push(matchedCategory.categoryNameCandidate ? `No exact category match for "${matchedCategory.categoryNameCandidate}"` : "No category was identified from the voice note");
    }

    return {
      transcript,
      draft: {
        kind: extracted.kind,
        amount: extracted.amount,
        currency: extracted.currency,
        categoryId: matchedCategory.categoryId,
        categoryNameCandidate: matchedCategory.categoryId ? null : matchedCategory.categoryNameCandidate,
        note: extracted.note,
        confidence: extracted.confidence,
        missingFields: Array.from(missingFields),
        warnings
      }
    };
  }
}
