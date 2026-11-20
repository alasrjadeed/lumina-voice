import { Link } from 'react-router-dom'
import { BrandMark } from '../art/covers'

const EFFECTIVE = '20 November 2026'

export default function Privacy() {
  return (
    <div className="site-page legal-page">
      <header className="site-header">
        <div className="brand" title="Lumina Voice">
          <BrandMark />
        </div>
        <nav className="site-nav" aria-label="Legal">
          <Link to="/site">Website</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </header>

      <section className="site-section legal-hero">
        <div className="kicker">AL ASAR JADEED</div>
        <h1>Privacy policy</h1>
        <p className="site-about">
          Lumina Voice is a free, offline-first Urdu audiobook, ghazal and audio-drama player. This policy explains
          what the app stores, what syncs, and how to request removal of your account. Effective {EFFECTIVE}.
        </p>
      </section>

      <section className="site-section legal-section">
        <h2>What the app does</h2>
        <p>
          The catalogue points to public audio streams hosted by Archive.org. Episodes stream directly from
          Archive.org; Lumina Voice does not host, re-encode or proxy the audio. Downloads, subtitles and artwork
          are stored on your device so listening works offline.
        </p>
      </section>

      <section className="site-section legal-section">
        <h2>Information we handle</h2>
        <ul>
          <li><strong>Account:</strong> email address, user ID and display name when you sign in.</li>
          <li><strong>Listening data:</strong> library, saved positions, history, search recents, ratings, reviews, settings, artwork, subtitles and metadata for titles you import.</li>
          <li><strong>Cloud sync:</strong> a metadata-only bundle in Supabase under your user ID so the website and Android app stay in sync.</li>
          <li><strong>Device storage:</strong> downloaded episodes, covers and subtitles are kept in app-private storage on your device.</li>
          <li><strong>Archive.org:</strong> playback requests go directly to Archive.org, which may see your IP address and standard request data.</li>
        </ul>
        <p>
          <strong>No audio bytes are uploaded.</strong> Importing a title stores only its Archive.org address and
          metadata. The transfer bundle and cloud sync contain metadata only, never audio files.
        </p>
      </section>

      <section className="site-section legal-section">
        <h2>What we do not do</h2>
        <ul>
          <li>No advertising SDK or behavioural ad tracking is bundled at launch.</li>
          <li>No microphone, camera, contacts, location or SMS access is requested.</li>
          <li>No live radio requests are made; the radio feature is paused.</li>
          <li>No private broadcast server addresses are used by the store build.</li>
        </ul>
      </section>

      <section className="site-section legal-section">
        <h2>Permissions</h2>
        <p>
          The Android app requests internet access to stream Archive.org audio and sync metadata. App-private file
          storage is used for offline episodes. The share feature uses Android FileProvider to share a metadata
          backup with another app you choose.
        </p>
      </section>

      <section className="site-section legal-section">
        <h2>Third-party services</h2>
        <p>
          Supabase provides sign-in and metadata sync. Archive.org provides the audio catalogue and streams.
          Error alerts use Sentry only when a DSN is configured; the public release ships with alerts off by
          default.
        </p>
      </section>

      <section className="site-section legal-section">
        <h2>Delete your account</h2>
        <p>
          In the app, open <strong>Settings → Account → Delete account</strong> and send the prefilled request to{' '}
          <a href="mailto:info@alasarjadeed.com">info@alasarjadeed.com</a>. Include the email address used to sign
          in. We remove the account profile, cloud-synced metadata, ratings and reviews, and confirm by email.
          Offline files already on your device remain under your control and can be deleted from the File Library.
        </p>
      </section>

      <section className="site-section legal-section">
        <h2>Contact</h2>
        <p>
          Developer: <strong>AL ASAR JADEED</strong><br />
          Website: <a href="https://www.alasarjadeed.com">www.alasarjadeed.com</a><br />
          Email: <a href="mailto:info@alasarjadeed.com">info@alasarjadeed.com</a>
        </p>
      </section>

      <footer className="site-footer">AL ASAR JADEED · WEBSITE: www.alasarjadeed.com · Lumina Voice</footer>
    </div>
  )
}
