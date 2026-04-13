"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";

import type { GoodsCatalogCategory, GoodsCatalogPlace, GoodsEvent, GoodsItem, GoodsUom } from "./types";

type GoodsItemCardProps = {
  item: GoodsItem;
  places: GoodsCatalogPlace[];
  categories: GoodsCatalogCategory[];
  uoms: GoodsUom[];
  history?: GoodsEvent[];
  isSubmitting: boolean;
  onLoadHistory: (itemId: string) => Promise<void>;
  onRestockItem: (itemId: string, quantity: number, reason?: string) => Promise<void>;
  onConsumeItem: (itemId: string, quantity: number, reason?: string) => Promise<void>;
  onReconcileItem: (itemId: string, quantity: number, reason?: string) => Promise<void>;
  onMoveItem: (itemId: string, placeId: string, categoryId: string, reason?: string) => Promise<void>;
  onUpdateItem: (itemId: string, payload: Record<string, unknown>) => Promise<void>;
  onArchiveItem: (itemId: string) => Promise<void>;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function stockTone(status: GoodsItem["stockStatus"]) {
  if (status === "OUT_OF_STOCK") {
    return "status-error";
  }

  if (status === "LOW") {
    return "text-amber-700 dark:text-amber-300";
  }

  if (status === "FULL") {
    return "status-success";
  }

  return "body-muted";
}

export function GoodsItemCard(props: GoodsItemCardProps) {
  const [restockQuantity, setRestockQuantity] = useState("");
  const [consumeQuantity, setConsumeQuantity] = useState("");
  const [reconcileQuantity, setReconcileQuantity] = useState(String(props.item.effectiveQuantity));
  const [movePlaceId, setMovePlaceId] = useState(props.item.place?.id ?? "");
  const [moveCategoryId, setMoveCategoryId] = useState(props.item.category?.id ?? "");
  const [editName, setEditName] = useState(props.item.name);
  const [editNote, setEditNote] = useState(props.item.note ?? "");
  const [editUomId, setEditUomId] = useState(props.item.uom?.id ?? "");
  const [editExpirationDate, setEditExpirationDate] = useState(props.item.expirationDate?.slice(0, 10) ?? "");
  const [editLowStockThreshold, setEditLowStockThreshold] = useState(String(props.item.lowStockThreshold));
  const [editTargetQuantity, setEditTargetQuantity] = useState(String(props.item.targetQuantity));
  const [editRateValue, setEditRateValue] = useState(props.item.consumptionRateValue == null ? "" : String(props.item.consumptionRateValue));
  const [editRateUnit, setEditRateUnit] = useState(props.item.consumptionRateUnit);

  useEffect(() => {
    setReconcileQuantity(String(props.item.effectiveQuantity));
    setMovePlaceId(props.item.place?.id ?? "");
    setMoveCategoryId(props.item.category?.id ?? "");
    setEditName(props.item.name);
    setEditNote(props.item.note ?? "");
    setEditUomId(props.item.uom?.id ?? "");
    setEditExpirationDate(props.item.expirationDate?.slice(0, 10) ?? "");
    setEditLowStockThreshold(String(props.item.lowStockThreshold));
    setEditTargetQuantity(String(props.item.targetQuantity));
    setEditRateValue(props.item.consumptionRateValue == null ? "" : String(props.item.consumptionRateValue));
    setEditRateUnit(props.item.consumptionRateUnit);
  }, [props.item]);

  const scopedPlaces = props.places.filter((item) => item.scope === props.item.scope);
  const scopedCategories = props.categories.filter((item) => item.scope === props.item.scope);

  return (
    <Card className="panel-soft">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{props.item.name}</CardTitle>
            <p className="body-muted text-sm">
              {props.item.place?.name ?? "No place"} • {props.item.category?.name ?? "No category"} • {props.item.scope}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">
              {props.item.effectiveQuantity} {props.item.uom?.code}
            </p>
            <p className={stockTone(props.item.stockStatus)}>{props.item.stockStatus.replaceAll("_", " ")}</p>
          </div>
        </div>
        <div className="grid gap-2 text-sm md:grid-cols-4">
          <div className="detail-box px-3 py-2">Freshness: {props.item.expirationStatus.replaceAll("_", " ")}</div>
          <div className="detail-box px-3 py-2">Expires: {props.item.expirationDate ? props.item.expirationDate.slice(0, 10) : "Not set"}</div>
          <div className="detail-box px-3 py-2">Run out: {props.item.estimatedRunOutAt ? formatDateTime(props.item.estimatedRunOutAt) : "Not estimated"}</div>
          <div className="detail-box px-3 py-2">Updated: {formatDateTime(props.item.lastStockEventAt)}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="detail-box space-y-2 px-3 py-3">
            <p className="field-label">Quick stock actions</p>
            <div className="flex gap-2">
              <TextField value={restockQuantity} onChange={(event) => setRestockQuantity(event.target.value)} placeholder="Restock qty" />
              <Button type="button" variant="outline" disabled={props.isSubmitting || !restockQuantity} onClick={() => void props.onRestockItem(props.item.id, Number(restockQuantity))}>
                Restock
              </Button>
            </div>
            <div className="flex gap-2">
              <TextField value={consumeQuantity} onChange={(event) => setConsumeQuantity(event.target.value)} placeholder="Consume qty" />
              <Button type="button" variant="outline" disabled={props.isSubmitting || !consumeQuantity} onClick={() => void props.onConsumeItem(props.item.id, Number(consumeQuantity))}>
                Use
              </Button>
            </div>
            <div className="flex gap-2">
              <TextField value={reconcileQuantity} onChange={(event) => setReconcileQuantity(event.target.value)} placeholder="Exact balance" />
              <Button type="button" variant="outline" disabled={props.isSubmitting || !reconcileQuantity} onClick={() => void props.onReconcileItem(props.item.id, Number(reconcileQuantity))}>
                Set balance
              </Button>
            </div>
          </div>

          <div className="detail-box space-y-2 px-3 py-3">
            <p className="field-label">Move item</p>
            <SelectField value={movePlaceId} onChange={(event) => setMovePlaceId(event.target.value)}>
              {scopedPlaces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField value={moveCategoryId} onChange={(event) => setMoveCategoryId(event.target.value)}>
              {scopedCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <Button type="button" variant="outline" disabled={props.isSubmitting || !movePlaceId || !moveCategoryId} onClick={() => void props.onMoveItem(props.item.id, movePlaceId, moveCategoryId)}>
              Save move
            </Button>
          </div>

          <div className="detail-box space-y-2 px-3 py-3">
            <p className="field-label">History</p>
            <Button type="button" variant="outline" disabled={props.isSubmitting} onClick={() => void props.onLoadHistory(props.item.id)}>
              Load history
            </Button>
            <div className="space-y-2 text-sm">
              {props.history?.length ? (
                props.history.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[rgba(201,168,76,0.16)] px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>{entry.eventType}</span>
                      <span>{entry.quantityAfter}</span>
                    </div>
                    <div className="body-muted mt-1 text-xs">{formatDateTime(entry.occurredAt)}</div>
                  </div>
                ))
              ) : (
                <p className="body-muted text-sm">History is hidden until loaded.</p>
              )}
            </div>
          </div>
        </div>

        <div className="detail-box space-y-3 px-3 py-3">
          <p className="field-label">Metadata</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <TextField value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Name" />
            <SelectField value={editUomId} onChange={(event) => setEditUomId(event.target.value)}>
              {props.uoms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code}
                </option>
              ))}
            </SelectField>
            <TextField type="date" value={editExpirationDate} onChange={(event) => setEditExpirationDate(event.target.value)} />
            <SelectField value={editRateUnit} onChange={(event) => setEditRateUnit(event.target.value as GoodsItem["consumptionRateUnit"])}>
              <option value="PERMANENT">Permanent</option>
              <option value="HOUR">Per hour</option>
              <option value="DAY">Per day</option>
              <option value="WEEK">Per week</option>
            </SelectField>
            <TextField value={editRateValue} onChange={(event) => setEditRateValue(event.target.value)} placeholder="Rate value" />
            <TextField value={editLowStockThreshold} onChange={(event) => setEditLowStockThreshold(event.target.value)} placeholder="Low threshold" />
            <TextField value={editTargetQuantity} onChange={(event) => setEditTargetQuantity(event.target.value)} placeholder="Target qty" />
          </div>
          <TextareaField value={editNote} onChange={(event) => setEditNote(event.target.value)} placeholder="Note" rows={3} />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={props.isSubmitting}
              onClick={() =>
                void props.onUpdateItem(props.item.id, {
                  name: editName,
                  note: editNote,
                  uomId: editUomId,
                  expirationDate: editExpirationDate || null,
                  lowStockThreshold: Number(editLowStockThreshold),
                  targetQuantity: Number(editTargetQuantity),
                  consumptionRateValue: editRateUnit === "PERMANENT" ? null : Number(editRateValue || 0),
                  consumptionRateUnit: editRateUnit
                })
              }
            >
              Save metadata
            </Button>
            <Button type="button" variant="outline" disabled={props.isSubmitting} onClick={() => void props.onArchiveItem(props.item.id)}>
              Archive
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
