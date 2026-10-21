'use client'

import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extensions'
import { uploadImage, validateImageFile } from '@/lib/upload-image'

interface RichTextEditorProps {
  /** Nilai HTML yang dikendalikan induk. */
  value: string
  /** Dipanggil tiap isi berubah (HTML dari editor). */
  onChange: (html: string) => void
  label?: string
  helper?: string
  placeholder?: string
}

/** Tombol toolbar kecil. */
function ToolButton({
  label,
  title,
  active,
  disabled,
  onClick,
}: {
  label: string
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm leading-none transition-colors disabled:opacity-40 ${
        active
          ? 'bg-green-900 text-white'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
      }`}
    >
      {label}
    </button>
  )
}

/**
 * Editor teks-berformat (Tiptap) untuk isi artikel/pengumuman.
 * Toolbar lengkap + sisip gambar (unggah file atau tautan URL) + dukungan
 * paste/drag-drop gambar langsung ke area tulis.
 */
export function RichTextEditor({
  value,
  onChange,
  label = 'Isi artikel',
  helper,
  placeholder = 'Tulis isi artikel di sini…',
}: RichTextEditorProps) {
  const [imageDialog, setImageDialog] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, linkOnPaste: true },
      }),
      Image.configure({ allowBase64: false, resize: { enabled: true } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: { class: 'focus:outline-none' },
      // Tempel gambar dari clipboard → unggah otomatis.
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files ?? [])
        const image = files.find((f) => f.type.startsWith('image/'))
        if (!image) return false
        event.preventDefault()
        void uploadAndInsert(view, image)
        return true
      },
      // Drag-drop gambar dari desktop → unggah otomatis.
      handleDrop(view, event) {
        const files = Array.from(
          (event as DragEvent).dataTransfer?.files ?? [],
        )
        const image = files.find((f) => f.type.startsWith('image/'))
        if (!image) return false
        event.preventDefault()
        void uploadAndInsert(view, image)
        return true
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  })

  // Sinkronkan bila nilai induk berubah dari luar (mis. konversi legacy saat muat).
  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  async function uploadAndInsert(view: unknown, file: File) {
    const validation = validateImageFile(file)
    if (validation) {
      setError(validation)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const url = await uploadImage(file, 'articles')
      insertImageAtCursor(view as { editor: Editor }, url, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setUploading(false)
    }
  }

  function insertImageAtCursor(target: { editor: Editor } | null, src: string, alt = '') {
    const ed = target?.editor ?? editor
    if (!ed) return
    ed.chain().focus().setImage({ src, alt }).run()
  }

  function openImageDialog() {
    setImageUrl('')
    setImageAlt('')
    setError(null)
    setImageDialog(true)
  }

  function confirmInsertUrl() {
    const url = imageUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      setError('URL gambar harus diawali http:// atau https://')
      return
    }
    insertImageAtCursor(null, url, imageAlt.trim())
    setImageDialog(false)
  }

  function handleDialogFile(file: File) {
    const validation = validateImageFile(file)
    if (validation) {
      setError(validation)
      return
    }
    setUploading(true)
    setError(null)
    uploadImage(file, 'articles')
      .then((url) => {
        insertImageAtCursor(null, url, imageAlt.trim())
        setImageDialog(false)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Upload gagal'))
      .finally(() => setUploading(false))
  }

  if (!editor) {
    return (
      <label className="block space-y-1">
        <span className="block text-sm font-medium text-neutral-700">{label}</span>
        <div className="h-64 animate-pulse rounded-md border border-black/10 bg-neutral-50" />
      </label>
    )
  }

  const align = (value: string) => () => editor.chain().focus().setTextAlign(value).run()

  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-neutral-700">{label}</span>

      <div className="rounded-md border border-black/10 bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-black/10 p-1">
          <select
            aria-label="Tipe blok"
            value={
              editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : editor.isActive('heading', { level: 4 })
                    ? 'h4'
                    : 'p'
            }
            onChange={(e) => {
              const v = e.target.value
              if (v === 'p') editor.chain().focus().setParagraph().run()
              else
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: Number(v) as 2 | 3 | 4 })
                  .run()
            }}
            className="mr-1 rounded border border-black/10 bg-white px-1 py-1 text-sm text-neutral-700"
          >
            <option value="p">Paragraf</option>
            <option value="h2">Judul 2</option>
            <option value="h3">Judul 3</option>
            <option value="h4">Judul 4</option>
          </select>

          <ToolButton
            label="B"
            title="Tebal"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolButton
            label="I"
            title="Miring"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolButton
            label="U"
            title="Garis bawah"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolButton
            label="S"
            title="Coret"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <ToolButton
            label="</>"
            title="Kode"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          />

          <span className="mx-1 h-5 w-px bg-black/10" />

          <ToolButton
            label="•"
            title="Daftar butir"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolButton
            label="1."
            title="Daftar bernomor"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolButton
            label="❝"
            title="Kutipan"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
          <ToolButton
            label="—"
            title="Garis pemisah"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          />

          <span className="mx-1 h-5 w-px bg-black/10" />

          <ToolButton
            label="🔗"
            title="Sisip tautan"
            active={editor.isActive('link')}
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run()
              } else {
                const url = window.prompt('URL tautan:', 'https://')
                if (url && /^https?:\/\//i.test(url.trim())) {
                  editor.chain().focus().setLink({ href: url.trim() }).run()
                }
              }
            }}
          />
          <ToolButton label="🖼" title="Sisip gambar" onClick={openImageDialog} />

          <span className="mx-1 h-5 w-px bg-black/10" />

          <ToolButton
            label="⇤"
            title="Rata kiri"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={align('left')}
          />
          <ToolButton
            label="≡"
            title="Rata tengah"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={align('center')}
          />
          <ToolButton
            label="⇥"
            title="Rata kanan"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={align('right')}
          />

          <span className="mx-1 h-5 w-px bg-black/10" />

          <ToolButton
            label="Tx"
            title="Hapus format"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          />
          <ToolButton
            label="↶"
            title="Urungkan"
            onClick={() => editor.chain().focus().undo().run()}
          />
          <ToolButton
            label="↷"
            title="Ulangi"
            onClick={() => editor.chain().focus().redo().run()}
          />
        </div>

        {/* Area tulis */}
        <div className="article-body">
          <EditorContent editor={editor} />
        </div>
      </div>

      {uploading && <p className="text-xs text-neutral-500">Mengunggah gambar…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helper ? (
        <p className="mt-1 text-xs text-neutral-500">{helper}</p>
      ) : null}

      {/* Dialog sisip gambar */}
      {imageDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sisipkan gambar"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setImageDialog(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold text-neutral-900">
              Sisipkan gambar
            </h3>

            <div className="space-y-3">
              <div>
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  Unggah file
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleDialogFile(file)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-green-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-green-800"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  JPG, PNG, atau WebP — maksimal 5MB.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="h-px flex-1 bg-neutral-200" />
                atau
                <span className="h-px flex-1 bg-neutral-200" />
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  Tautan URL
                </span>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…/gambar.jpg"
                  className="mb-2 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus:ring-green-900/40"
                />
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Teks alternatif (alt) — untuk aksesibilitas"
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus:ring-green-900/40"
                />
                <button
                  type="button"
                  onClick={confirmInsertUrl}
                  disabled={uploading}
                  className="mt-2 w-full rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                >
                  Sisipkan
                </button>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <button
              type="button"
              onClick={() => setImageDialog(false)}
              className="mt-4 text-sm font-medium text-neutral-500 hover:text-neutral-700"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </label>
  )
}
