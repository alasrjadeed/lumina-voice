import { useState } from 'react'
import { useApp } from '../state/AppState.jsx'
import {
  IcoAddContent, IcoArchive, IcoBot, IcoCloud, IcoContent, IcoDown,
  IcoMegaphone, IcoSubtitles, IcoVoice, IcoWebsite
} from '../ui/Icons'
import Advertising from './Advertising'
import ArchiveLibraryAdmin from './ArchiveLibraryAdmin'
import Catalog from './Catalog'
import DataTransfer from './DataTransfer'
import FileLibrary from './FileLibrary'
import ImportStudio from './ImportStudio.jsx'
import LuminaBot from './LuminaBot.jsx'
import SubtitleStudio from './SubtitleStudio'
import SupabaseAdmin, { supabaseTab } from './SupabaseAdmin.jsx'
import VoiceCorrector from './VoiceCorrector'
import WebsiteAdmin from './WebsiteAdmin.jsx'

const TABS = [
  { id: 'content', label: 'Content', icon: IcoContent },
  { id: 'add', label: 'Add content', icon: IcoAddContent },
  { id: 'website', label: 'Website', icon: IcoWebsite },
  { id: 'bot', label: 'Lumina Bot', icon: IcoBot },
  { id: 'subtitles', label: 'Subtitles', icon: IcoSubtitles },
  { id: 'voices', label: 'Voices', icon: IcoVoice },
  { id: 'ads', label: 'Advertising', icon: IcoMegaphone },
  { id: 'cloud', label: 'Cloud catalog', icon: IcoCloud },
  { id: 'archive', label: 'Archive library', icon: IcoArchive },
  supabaseTab,
  { id: 'data', label: 'Data transfer', icon: IcoDown }
]

export default function DeviceAdmin() {
  const { isAdmin } = useApp()
  const [tab, setTab] = useState('content')

  if (!isAdmin) {
    return (
      <div className="empty">
        <h3>Admin access only</h3>
        <p>Sign in with the device admin account to manage content.</p>
      </div>
    )
  }

  return (
    <>
      <div className="admin-head">
        <div className="admin-head-l">
          <IcoContent />
          <div>
            <div className="kicker">LUMINA VOICE</div>
            <h1>Device Admin</h1>
          </div>
        </div>
        <div className="admin-status"><span className="status-chip">Device tools only</span></div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} />
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'content' ? <FileLibrary /> : null}
      {tab === 'add' ? <ImportStudio admin /> : null}
      {tab === 'website' ? <WebsiteAdmin /> : null}
      {tab === 'bot' ? <LuminaBot /> : null}
      {tab === 'subtitles' ? <SubtitleStudio /> : null}
      {tab === 'voices' ? <VoiceCorrector /> : null}
      {tab === 'ads' ? <Advertising /> : null}
      {tab === 'cloud' ? <Catalog /> : null}
      {tab === 'archive' ? <ArchiveLibraryAdmin /> : null}
      {tab === 'supabase' ? <SupabaseAdmin /> : null}
      {tab === 'data' ? <DataTransfer /> : null}
    </>
  )
}
