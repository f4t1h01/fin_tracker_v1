import type { VoiceTransactionKind } from "./voice-transaction-draft.schema";

export type VoiceCategoryScope = "PERSONAL" | "SHARED";

export type VoiceCategoryTreeNode = {
  id: string;
  name: string;
  scope: VoiceCategoryScope;
  kind: VoiceTransactionKind;
  ownerUserId: string | null;
  isVisible: boolean;
  children: Array<{
    id: string;
    name: string;
    scope: VoiceCategoryScope;
    kind: VoiceTransactionKind;
    ownerUserId: string | null;
    isVisible: boolean;
  }>;
};

export type VoiceCategoryCatalog = {
  preferences: {
    showSharedCategories: boolean;
    defaultIncomeCategoryId: string | null;
    defaultExpenseCategoryId: string | null;
  };
  byKind: Record<VoiceTransactionKind, { personal: VoiceCategoryTreeNode[]; shared: VoiceCategoryTreeNode[] }>;
};

export type VoiceCategoryMatch = {
  categoryId: string | null;
  categoryNameCandidate: string | null;
  matchedLabel: string | null;
  availableLabels: string[];
};

function normalizeLookupText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function flattenVisibleLabels(nodes: VoiceCategoryTreeNode[], prefix?: string) {
  const entries: Array<{ id: string; label: string; normalizedVariants: Set<string> }> = [];

  for (const node of nodes) {
    if (!node.isVisible) {
      continue;
    }

    const topLabel = prefix ? `${prefix} / ${node.name}` : node.name;
    entries.push({
      id: node.id,
      label: topLabel,
      normalizedVariants: new Set([normalizeLookupText(node.name), normalizeLookupText(topLabel)])
    });

    for (const child of node.children) {
      if (!child.isVisible) {
        continue;
      }

      const childLabel = `${topLabel} / ${child.name}`;
      entries.push({
        id: child.id,
        label: childLabel,
        normalizedVariants: new Set([
          normalizeLookupText(child.name),
          normalizeLookupText(`${node.name} ${child.name}`),
          normalizeLookupText(childLabel)
        ])
      });
    }
  }

  return entries;
}

function collectVisibleEntries(catalog: VoiceCategoryCatalog, kind: VoiceTransactionKind) {
  const personal = flattenVisibleLabels(catalog.byKind[kind].personal);
  const shared = catalog.preferences.showSharedCategories ? flattenVisibleLabels(catalog.byKind[kind].shared) : [];
  return [...personal, ...shared];
}

function formatVisibleCategoryGroup(title: string, nodes: VoiceCategoryTreeNode[]) {
  const labels = flattenVisibleLabels(nodes)
    .map((item) => `- ${item.label}`)
    .join("\n");

  return labels.length > 0 ? `${title}\n${labels}` : `${title}\n- None`;
}

export function buildVoiceCategoryContext(catalog: VoiceCategoryCatalog) {
  return [
    formatVisibleCategoryGroup("Expense categories - personal", catalog.byKind.EXPENSE.personal),
    catalog.preferences.showSharedCategories ? formatVisibleCategoryGroup("Expense categories - shared", catalog.byKind.EXPENSE.shared) : "Expense categories - shared\n- Hidden",
    formatVisibleCategoryGroup("Income categories - personal", catalog.byKind.INCOME.personal),
    catalog.preferences.showSharedCategories ? formatVisibleCategoryGroup("Income categories - shared", catalog.byKind.INCOME.shared) : "Income categories - shared\n- Hidden"
  ].join("\n\n");
}

export function matchVoiceCategory(params: {
  catalog: VoiceCategoryCatalog;
  kind: VoiceTransactionKind | null;
  categoryName: string | null;
}): VoiceCategoryMatch {
  const categoryNameCandidate = params.categoryName?.trim() || null;

  if (!params.kind || !categoryNameCandidate) {
    return {
      categoryId: null,
      categoryNameCandidate,
      matchedLabel: null,
      availableLabels: params.kind ? collectVisibleEntries(params.catalog, params.kind).map((item) => item.label) : []
    };
  }

  const normalizedCandidate = normalizeLookupText(categoryNameCandidate);
  const entries = collectVisibleEntries(params.catalog, params.kind);
  const matched = entries.find((entry) => entry.normalizedVariants.has(normalizedCandidate)) ?? null;

  return {
    categoryId: matched?.id ?? null,
    categoryNameCandidate,
    matchedLabel: matched?.label ?? null,
    availableLabels: entries.map((item) => item.label)
  };
}
