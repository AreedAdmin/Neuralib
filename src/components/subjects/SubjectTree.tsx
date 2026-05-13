"use client";

import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createSubject,
  deleteSubject,
  renameSubject,
} from "@/lib/actions/subjects";
import type { SubjectNode } from "@/lib/db/subjects";

export function SubjectTree({
  nodes,
  depth,
  pathSoFar,
}: {
  nodes: SubjectNode[];
  depth: number;
  pathSoFar: string[];
}) {
  return (
    <ul className="flex flex-col">
      {nodes.map((node) => (
        <Node key={node.id} node={node} depth={depth} pathSoFar={pathSoFar} />
      ))}
    </ul>
  );
}

function Node({
  node,
  depth,
  pathSoFar,
}: {
  node: SubjectNode;
  depth: number;
  pathSoFar: string[];
}) {
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const path = [...pathSoFar, node.slug];
  const href = `/s/${path.join("/")}`;
  const isActive = pathname === href || pathname.startsWith(href + "/");
  const hasChildren = node.children.length > 0;

  function handleNewChild() {
    const name = window.prompt(`New subject under "${node.name}":`);
    if (!name) return;
    startTransition(async () => {
      const res = await createSubject({ name, parentId: node.id });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`Created "${name.trim()}".`);
        setOpen(true);
      }
    });
  }

  function handleRename() {
    const next = window.prompt("Rename subject:", node.name);
    if (!next || next === node.name) return;
    startTransition(async () => {
      const res = await renameSubject(node.id, next);
      if (!res.ok) toast.error(res.error);
      else toast.success("Renamed.");
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${node.name}"? Children will be removed too. Cards inside must be moved or deleted first.`
    );
    if (!confirmed) return;
    startTransition(async () => {
      const res = await deleteSubject(node.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Deleted.");
    });
  }

  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-(--radius-xs) py-1 pl-${depth * 2} pr-1 text-sm hover:bg-(--color-cream-3) ${
          isActive ? "bg-(--color-coral-soft)" : ""
        }`}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((v) => !v)}
          className="flex size-5 shrink-0 items-center justify-center text-(--color-ink-muted)"
        >
          {hasChildren ? (
            <ChevronRight
              className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`}
            />
          ) : (
            <span className="size-3.5" />
          )}
        </button>

        <Link
          href={href}
          className={`flex-1 truncate no-underline ${
            isActive ? "font-medium text-(--color-ink)" : "text-(--color-ink)"
          } hover:text-(--color-ink)`}
        >
          {node.name}
        </Link>

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconBtn label="New child" onClick={handleNewChild} disabled={pending}>
            <Plus className="size-3.5" />
          </IconBtn>
          <IconBtn label="Rename" onClick={handleRename} disabled={pending}>
            <Pencil className="size-3.5" />
          </IconBtn>
          <IconBtn label="Delete" onClick={handleDelete} disabled={pending} danger>
            <Trash2 className="size-3.5" />
          </IconBtn>
        </div>
      </div>

      {open && hasChildren ? (
        <SubjectTree nodes={node.children} depth={depth + 1} pathSoFar={path} />
      ) : null}
    </li>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex size-6 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) hover:bg-(--color-cream-2) ${
        danger ? "hover:text-(--color-coral)" : "hover:text-(--color-ink)"
      } disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
