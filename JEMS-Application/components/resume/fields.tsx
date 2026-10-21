"use client";

import { useState, type ReactNode } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { reorder } from "./types";

export const rInput =
  "h-10 w-full rounded-md border border-lightgray bg-white px-3 text-sm text-navy shadow-[0_1px_3px_rgba(0,0,0,0.08)] outline-none transition-all placeholder:text-mediumgray focus:border-slate focus:shadow-[0_4px_12px_rgba(234,88,12,0.15)]";

export const rTextarea =
  "min-h-20 w-full resize-y rounded-md border border-lightgray bg-white px-3 py-2 text-sm leading-6 text-navy shadow-[0_1px_3px_rgba(0,0,0,0.08)] outline-none transition-all placeholder:text-mediumgray focus:border-slate focus:shadow-[0_4px_12px_rgba(234,88,12,0.15)]";

function Label({ children, optional }: { children: ReactNode; optional?: boolean }) {
  return (
    <span className="mb-1 block text-xs font-medium text-navy">
      {children}
      {optional && <span className="ml-1 font-normal text-mediumgray">(optional)</span>}
    </span>
  );
}

interface InputProps {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  optional?: boolean;
}

export function LabeledInput({ label, value, onChange, placeholder, type = "text", optional }: InputProps) {
  return (
    <label className="block">
      <Label optional={optional}>{label}</Label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={rInput}
      />
    </label>
  );
}

interface TextareaProps {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  optional?: boolean;
}

export function LabeledTextarea({ label, value, onChange, placeholder, maxLength, optional }: TextareaProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between">
        <Label optional={optional}>{label}</Label>
        {maxLength && (
          <span className="text-[11px] text-mediumgray">
            {value.length}/{maxLength}
          </span>
        )}
      </span>
      <textarea
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={rTextarea}
      />
    </label>
  );
}

interface SelectProps {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}

export function LabeledSelect({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${rInput} appearance-none`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate px-4 py-2 text-sm font-semibold text-slate transition-colors hover:bg-[#eff6ff]"
    >
      <Plus className="h-4 w-4" />
      {children}
    </button>
  );
}

export function DeleteButton({ onClick, label = "Delete" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-mediumgray transition-colors hover:bg-[#fee2e2] hover:text-[#EF4444]"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

type HandleProps = {
  draggable: true;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export function GripHandle({ handleProps }: { handleProps: HandleProps }) {
  return (
    <span
      {...handleProps}
      aria-label="Drag to reorder"
      className="flex h-8 w-6 cursor-grab items-center justify-center text-mediumgray active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" />
    </span>
  );
}

interface ReorderableListProps<T> {
  items: T[];
  onReorder: (next: T[]) => void;
  getKey: (item: T) => string;
  renderItem: (item: T, index: number, handleProps: HandleProps) => ReactNode;
}

/** Generic vertical drag-to-reorder list. The drag handle lives on each row. */
export function ReorderableList<T>({ items, onReorder, getKey, renderItem }: ReorderableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const handleProps: HandleProps = {
          draggable: true,
          onDragStart: () => setDragIndex(index),
          onDragEnd: () => setDragIndex(null),
        };
        return (
          <div
            key={getKey(item)}
            onDragOver={(e) => {
              if (dragIndex !== null) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                onReorder(reorder(items, dragIndex, index));
              }
              setDragIndex(null);
            }}
            className={`transition-opacity ${dragIndex === index ? "opacity-40" : ""}`}
          >
            {renderItem(item, index, handleProps)}
          </div>
        );
      })}
    </div>
  );
}
