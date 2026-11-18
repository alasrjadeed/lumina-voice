// Feature switches for capabilities that are built but not currently launched.
// Radio stays in the source tree; set VITE_RADIO_ENABLED=true at build time to
// bring back the listener page, operator tabs and external stream calls.
export const RADIO_ENABLED = import.meta.env?.VITE_RADIO_ENABLED === 'true'
