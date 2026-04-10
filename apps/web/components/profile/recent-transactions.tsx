import type { FormEvent } from "react";

import { TransactionListCard } from "@/components/transactions/transaction-list-card";
import type { CategoryCatalogResponse, EditableTransaction, RecentTransaction, SupportedCurrency } from "./types";

type RecentTransactionsProps = {
  recent: RecentTransaction[];
  isLoadingData: boolean;
  isDeletingId: string | null;
  editingTransaction: EditableTransaction | null;
  categoryCatalog: CategoryCatalogResponse | null;
  currencyOptions: readonly SupportedCurrency[];
  setEditingTransaction: (value: EditableTransaction | null) => void;
  isSavingEdit: boolean;
  onStartEditing: (item: RecentTransaction) => void;
  onSaveEdit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteTransaction: (transactionId: string) => Promise<void>;
};

export function RecentTransactions(props: RecentTransactionsProps) {
  return (
    <TransactionListCard
      title="Recent transactions"
      items={props.recent}
      isLoadingData={props.isLoadingData}
      isDeletingId={props.isDeletingId}
      editingTransaction={props.editingTransaction}
      categoryCatalog={props.categoryCatalog}
      currencyOptions={props.currencyOptions}
      setEditingTransaction={props.setEditingTransaction}
      isSavingEdit={props.isSavingEdit}
      onStartEditing={props.onStartEditing}
      onSaveEdit={props.onSaveEdit}
      onDeleteTransaction={props.onDeleteTransaction}
      emptyText="No transactions yet."
    />
  );
}
