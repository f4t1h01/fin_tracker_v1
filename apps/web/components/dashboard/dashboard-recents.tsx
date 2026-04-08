import type { FormEvent } from "react";

import type { CategoryCatalogResponse, DashboardResponse, EditableTransaction, SupportedCurrency } from "@/components/profile/types";
import { TransactionListCard } from "@/components/transactions/transaction-list-card";

type DashboardRecentsProps = {
  transactions: DashboardResponse["transactions"];
  displayCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  onPageChange: (value: number) => void;
  isLoadingData: boolean;
  isDeletingId: string | null;
  editingTransaction: EditableTransaction | null;
  categoryCatalog: CategoryCatalogResponse | null;
  setEditingTransaction: (value: EditableTransaction | null) => void;
  isSavingEdit: boolean;
  onStartEditing: (item: DashboardResponse["transactions"]["items"][number]) => void;
  onSaveEdit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteTransaction: (transactionId: string) => Promise<void>;
  statusMessage?: string | null;
  statusError?: string | null;
};

export function DashboardRecents(props: DashboardRecentsProps) {
  return (
    <TransactionListCard
      title="Transactions"
      items={props.transactions.items}
      isLoadingData={props.isLoadingData}
      isDeletingId={props.isDeletingId}
      editingTransaction={props.editingTransaction}
      categoryCatalog={props.categoryCatalog}
      setEditingTransaction={props.setEditingTransaction}
      isSavingEdit={props.isSavingEdit}
      onStartEditing={props.onStartEditing}
      onSaveEdit={props.onSaveEdit}
      onDeleteTransaction={props.onDeleteTransaction}
      emptyText="No matches."
      pagination={{
        page: props.transactions.page,
        totalPages: props.transactions.totalPages,
        totalItems: props.transactions.totalItems,
        onPageChange: props.onPageChange
      }}
      displayCurrency={props.displayCurrency}
      rates={props.rates}
      statusMessage={props.statusMessage}
      statusError={props.statusError}
    />
  );
}
