import type { CategoryCatalogResponse, CategoryTreeNode } from "./types";

export type CategorySelectOption = {
  id: string;
  label: string;
  scope: "PERSONAL" | "SHARED";
  parentCategoryId: string | null;
};

function flattenNodes(nodes: CategoryTreeNode[]): CategorySelectOption[] {
  const output: CategorySelectOption[] = [];

  for (const node of nodes) {
    output.push({
      id: node.id,
      label: node.name,
      scope: node.scope,
      parentCategoryId: null
    });

    for (const child of node.children) {
      output.push({
        id: child.id,
        label: `${node.name} / ${child.name}`,
        scope: child.scope,
        parentCategoryId: node.id
      });
    }
  }

  return output;
}

export function buildCategoryOptions(
  catalog: CategoryCatalogResponse | null,
  kind: "EXPENSE" | "INCOME",
  options?: { forceIncludeShared?: boolean }
) {
  if (!catalog) {
    return {
      personal: [] as CategorySelectOption[],
      shared: [] as CategorySelectOption[]
    };
  }

  const personal = flattenNodes(catalog.byKind[kind].personal);
  const shared = flattenNodes(catalog.byKind[kind].shared);

  return {
    personal,
    shared: options?.forceIncludeShared || catalog.preferences.showSharedCategories ? shared : []
  };
}

export function findCategoryOptionById(
  catalog: CategoryCatalogResponse | null,
  kind: "EXPENSE" | "INCOME",
  categoryId: string,
  options?: { forceIncludeShared?: boolean }
) {
  const groups = buildCategoryOptions(catalog, kind, options);
  return [...groups.personal, ...groups.shared].find((item) => item.id === categoryId) ?? null;
}
