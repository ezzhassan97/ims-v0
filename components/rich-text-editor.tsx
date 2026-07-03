"use client"

import { useEffect, useRef, useState } from "react"
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Indent, Outdent, Link2, Maximize2, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Rich-text editor (contentEditable + toolbar) with a full-screen option that
 * opens a 90%-viewport modal of the same editor. Used for SEO descriptions and
 * the developer create form.
 */
export function RichTextEditor({
  value, onChange, dir, placeholder, minHeight = 200,
}: {
  value: string
  onChange: (html: string) => void
  dir?: "ltr" | "rtl"
  placeholder?: string
  minHeight?: number
}) {
  const [fullscreen, setFullscreen] = useState(false)
  const { words, chars } = countText(value)
  return (
    <div className="rounded-lg border border-border bg-card">
      <EditorBody value={value} onChange={onChange} dir={dir} placeholder={placeholder} minHeight={minHeight} onFullscreen={() => setFullscreen(true)} />
      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>{dir === "rtl" ? `الكلمات: ${words} · الأحرف: ${chars}` : `Words: ${words} · Characters: ${chars}`}</span>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6" onClick={() => setFullscreen(false)}>
          <div className="flex h-[90vh] w-[90vw] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <p className="text-sm font-semibold">{dir === "rtl" ? "الوصف" : "Description"}</p>
              <button onClick={() => setFullscreen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <EditorBody value={value} onChange={onChange} dir={dir} placeholder={placeholder} minHeight={0} fill />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditorBody({
  value, onChange, dir, placeholder, minHeight, fill, onFullscreen,
}: {
  value: string
  onChange: (html: string) => void
  dir?: "ltr" | "rtl"
  placeholder?: string
  minHeight: number
  fill?: boolean
  onFullscreen?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Set initial HTML once; keep it uncontrolled afterwards so the caret is preserved.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const exec = (cmd: string, arg?: string) => { document.execCommand(cmd, false, arg); ref.current?.focus(); onChange(ref.current?.innerHTML ?? "") }
  const tool = (icon: React.ReactNode, cmd: string, title: string, arg?: string) => (
    <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); exec(cmd, arg) }} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{icon}</button>
  )
  return (
    <div className={cn("flex flex-col", fill && "h-full")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        {tool(<Bold className="h-3.5 w-3.5" />, "bold", "Bold")}
        {tool(<Italic className="h-3.5 w-3.5" />, "italic", "Italic")}
        {tool(<Underline className="h-3.5 w-3.5" />, "underline", "Underline")}
        {tool(<Strikethrough className="h-3.5 w-3.5" />, "strikeThrough", "Strikethrough")}
        <div className="mx-1 h-4 w-px bg-border" />
        {tool(<ListOrdered className="h-3.5 w-3.5" />, "insertOrderedList", "Numbered list")}
        {tool(<List className="h-3.5 w-3.5" />, "insertUnorderedList", "Bullet list")}
        {tool(<Outdent className="h-3.5 w-3.5" />, "outdent", "Outdent")}
        {tool(<Indent className="h-3.5 w-3.5" />, "indent", "Indent")}
        {tool(<Link2 className="h-3.5 w-3.5" />, "createLink", "Link", "#")}
        {onFullscreen && (
          <button type="button" title="Full screen" onClick={onFullscreen} className="ml-auto flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Maximize2 className="h-3.5 w-3.5" /></button>
        )}
      </div>
      <div
        ref={ref}
        contentEditable
        dir={dir}
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        data-placeholder={placeholder}
        className={cn(
          "max-w-none overflow-y-auto px-3 py-2 text-sm outline-none [&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)] [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_a]:text-primary [&_a]:underline",
          dir === "rtl" && "text-right",
          fill && "h-full",
        )}
        style={fill ? undefined : { minHeight }}
      />
    </div>
  )
}

function countText(html: string) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim()
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0
  return { words, chars: text.length }
}
