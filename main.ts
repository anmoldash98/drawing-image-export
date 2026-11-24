import { App, FileView, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian'
import type { SettingDefinitionControl } from 'obsidian'

type Format = 'svg' | 'png'
type Preferences = Record<Format, boolean>

const formats = ['svg', 'png'] as const
const settingsDescription = 'Requires the tldraw plugin. Exports the visible page when a drawing in a focused tab saves.'

// The installed tldraw plugin owns the editor. Keep the unofficial interface small.
interface DrawingEditor {
  isDisposed?: boolean
  getContainer(): HTMLElement
  getCurrentPageId(): string
  getCurrentPageShapeIds(): ReadonlySet<string>
  toImage(ids: string[], options: { format: Format; background: boolean }): Promise<{ blob: Blob }>
}

type LoadedPluginRegistry = {
  plugins?: { getPlugin?(id: string): { currTldrawEditor?: unknown } | undefined }
}

function findEditor(app: App, file: TFile): DrawingEditor | undefined {
  const editor = (app as App & LoadedPluginRegistry).plugins?.getPlugin?.('tldraw')?.currTldrawEditor
  if (typeof editor !== 'object' || !editor) return
  const candidate = editor as Partial<DrawingEditor>
  if (
    candidate.isDisposed ||
    typeof candidate.getContainer !== 'function' ||
    typeof candidate.getCurrentPageId !== 'function' ||
    typeof candidate.getCurrentPageShapeIds !== 'function' ||
    typeof candidate.toImage !== 'function'
  ) return

  const container = candidate.getContainer()
  if (!container.isConnected) return
  let matchesFile = false
  app.workspace.iterateAllLeaves(({ view }) => {
    if (view instanceof FileView && view.file === file && view.contentEl.contains(container)) {
      matchesFile = true
    }
  })
  if (matchesFile) return candidate as DrawingEditor
}

type Job = {
  editor: DrawingEditor
  sourcePath: string
  page: string
}

export default class DrawingImageExport extends Plugin {
  settings: Preferences = { svg: false, png: false }
  private readonly pending = new Map<TFile, Job>()
  private readonly exporting = new Set<TFile>()
  private unloaded = false

  async onload() {
    const saved = (await this.loadData()) as Partial<Preferences> | null
    this.settings = { svg: saved?.svg === true, png: saved?.png === true }
    this.addSettingTab(new ExportSettings(this.app, this))
    this.registerEvent(this.app.vault.on('modify', (entry) => {
      if (entry instanceof TFile && (entry.extension === 'md' || entry.extension === 'tldr')) {
        this.queue(entry)
      }
    }))
  }

  onunload() {
    this.unloaded = true
    this.pending.clear()
  }

  private queue(file: TFile) {
    if (!this.settings.svg && !this.settings.png) return
    const editor = findEditor(this.app, file)
    if (!editor) return
    this.pending.set(file, { editor, sourcePath: file.path, page: editor.getCurrentPageId() })
    if (!this.exporting.has(file)) void this.drain(file)
  }

  private async drain(file: TFile) {
    this.exporting.add(file)
    try {
      let job: Job | undefined
      while ((job = this.pending.get(file))) {
        this.pending.delete(file)
        await this.exportPage(file, job)
      }
    } finally {
      this.exporting.delete(file)
    }
  }

  private async exportPage(file: TFile, { editor, sourcePath, page }: Job) {
    const isCurrent = () =>
      !this.unloaded &&
      !this.pending.has(file) &&
      this.app.vault.getFileByPath(sourcePath) === file &&
      findEditor(this.app, file) === editor &&
      editor.getCurrentPageId() === page

    for (const format of formats) {
      if (!this.settings[format]) continue
      if (!isCurrent()) return
      const path = `${sourcePath}.${format}`
      try {
        const ids = [...editor.getCurrentPageShapeIds()]
        const blob = ids.length
          ? (await editor.toImage(ids, { format, background: false })).blob
          : await blankImage(format)
        const contents = await blob.arrayBuffer()
        // Keep existing export checksums available after the plugin ID rename.
        const key = `drawing-image-export:export:${path}`
        const nextHash = await hash(contents)
        const { vault } = this.app
        const existing = vault.getAbstractFileByPath(path)
        if (existing) {
          const previousHash: unknown = this.app.loadLocalStorage(key)
          if (typeof previousHash !== 'string' || !(existing instanceof TFile) ||
              await hash(await vault.readBinary(existing)) !== previousHash) {
            new Notice(`${this.manifest.name} skipped "${path}" because that file already exists.`)
            continue
          }
          if (previousHash === nextHash || !isCurrent()) continue
          await vault.modifyBinary(existing, contents)
        } else {
          if (!isCurrent()) continue
          await vault.createBinary(path, contents)
        }
        this.app.saveLocalStorage(key, nextHash)
      } catch (error) {
        if (!this.unloaded) {
          console.error(`${this.manifest.name} failed`, path, error)
          new Notice(`Could not export "${path}".`)
        }
      }
    }
  }
}

class ExportSettings extends PluginSettingTab {
  constructor(app: App, private readonly companion: DrawingImageExport) {
    super(app, companion)
  }

  private readonly exportControls: SettingDefinitionControl<Format>[] = formats.map((format) => ({
    name: `Auto-export ${format.toUpperCase()}`,
    desc: `Save a ${format.toUpperCase()} beside the editable drawing.`,
    control: { type: 'toggle', key: format },
  }))

  override getSettingDefinitions() {
    return [
      { name: 'Drawing export', desc: settingsDescription, searchable: false },
      ...this.exportControls,
    ]
  }

  // Obsidian versions before 1.13 use this instead of the definitions above.
  override display() {
    this.containerEl.empty()
    this.containerEl.createEl('p', { text: settingsDescription })
    for (const { name, desc, control: { key } } of this.exportControls) {
      new Setting(this.containerEl)
        .setName(name)
        .setDesc(desc ?? '')
        .addToggle((toggle) => toggle
          .setValue(this.companion.settings[key])
          .onChange(async (enabled) => {
            this.companion.settings[key] = enabled
            await this.companion.saveData(this.companion.settings)
          }))
    }
  }
}

async function hash(contents: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', contents))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function blankImage(format: Format): Promise<Blob> {
  if (format === 'svg') {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
    return Promise.resolve(new Blob([svg], { type: 'image/svg+xml' }))
  }
  const canvas = createEl('canvas')
  canvas.width = canvas.height = 1
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not create a blank PNG.'))
    }, 'image/png')
  })
}
