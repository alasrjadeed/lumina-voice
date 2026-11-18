package com.luminavoice.app;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * On-device Urdu speech for the Android tablet.
 *
 * Android WebView does not implement speechSynthesis, so the Web Speech API in
 * deviceVoice.js cannot reach the language pack the tablet already has. This
 * plugin talks to the platform TextToSpeech engine directly: no key, no network,
 * no extra npm dependency.
 */
@CapacitorPlugin(name = "UrduTts")
public class UrduTtsPlugin extends Plugin {
    private static final String TAG = "LuminaTts";

    private TextToSpeech tts;
    private boolean ready = false;
    private String initError = null;
    private final List<Runnable> pending = new ArrayList<>();
    private int utteranceSeq = 0;

    @Override
    public void load() {
        tts = new TextToSpeech(getActivity().getApplicationContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                        JSObject data = new JSObject();
                        data.put("id", utteranceId);
                        notifyListeners("start", data);
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        JSObject data = new JSObject();
                        data.put("id", utteranceId);
                        notifyListeners("end", data);
                    }

                    @Override
                    public void onError(String utteranceId) {
                        JSObject data = new JSObject();
                        data.put("id", utteranceId);
                        notifyListeners("error", data);
                    }
                });
                ready = true;
                initError = null;
                Log.i(TAG, "engine ready: " + tts.getDefaultEngine());
            } else {
                ready = false;
                initError = "Device speech engine failed to start (" + status + ")";
                Log.w(TAG, initError);
            }
            flushPending();
        });
    }

    @Override
    public void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        ready = false;
        super.handleOnDestroy();
    }

    private void flushPending() {
        List<Runnable> queued = new ArrayList<>(pending);
        pending.clear();
        for (Runnable action : queued) action.run();
    }

    private void whenReady(PluginCall call, Runnable action) {
        if (ready && tts != null) {
            action.run();
        } else if (initError != null) {
            call.reject(initError);
        } else {
            pending.add(() -> {
                if (ready && tts != null) action.run();
                else call.reject(initError != null ? initError : "Device speech engine is unavailable");
            });
        }
    }

    private boolean urdu(String lang) {
        return lang != null && lang.toLowerCase().startsWith("ur");
    }

    private boolean languageAvailable(Locale locale) {
        int available = tts.isLanguageAvailable(locale);
        return available == TextToSpeech.LANG_AVAILABLE
                || available == TextToSpeech.LANG_COUNTRY_AVAILABLE
                || available == TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE;
    }

    /** Prefer the installed Urdu pack; fall back to any Urdu locale the engine accepts. */
    private String chooseLanguage(String wanted) {
        Locale[] candidates = urdu(wanted)
                ? new Locale[] { new Locale("ur", "PK"), new Locale("ur", "IN"), new Locale("ur") }
                : new Locale[] { Locale.UK, Locale.US };
        for (Locale candidate : candidates) {
            if (languageAvailable(candidate)) {
                int set = tts.setLanguage(candidate);
                if (set != TextToSpeech.LANG_MISSING_DATA && set != TextToSpeech.LANG_NOT_SUPPORTED) {
                    return candidate.toString().replace('_', '-');
                }
            }
            Log.i(TAG, "language unavailable: " + candidate + " (" + tts.isLanguageAvailable(candidate) + ")");
        }
        return null;
    }

    /** Explicit choice wins; otherwise pick a local, named voice in the chosen language. */
    private Voice chooseVoice(String voiceName, Locale chosenLocale) {
        Voice sameCountry = null;
        Voice anyLocal = null;
        Voice fallback = null;
        for (Voice voice : tts.getVoices()) {
            Locale locale = voice.getLocale();
            if (locale == null || !locale.getLanguage().equalsIgnoreCase(chosenLocale.getLanguage())) continue;
            if (voiceName != null && voiceName.equals(voice.getName())) return voice;
            boolean local = !voice.isNetworkConnectionRequired();
            boolean generic = voice.getName().endsWith("-language");
            if (local && !generic && locale.getCountry().equalsIgnoreCase(chosenLocale.getCountry()) && sameCountry == null) {
                sameCountry = voice;
            }
            if (local && !generic && anyLocal == null) anyLocal = voice;
            if (fallback == null) fallback = voice;
        }
        return sameCountry != null ? sameCountry : (anyLocal != null ? anyLocal : fallback);
    }

    private JSObject voiceJson(Voice voice) {
        JSObject item = new JSObject();
        item.put("name", voice.getName());
        item.put("lang", voice.getLocale() == null ? "" : voice.getLocale().toString().replace('_', '-'));
        item.put("uri", voice.getName());
        item.put("local", !voice.isNetworkConnectionRequired());
        return item;
    }

    private JSObject statusJson() {
        JSObject result = new JSObject();
        result.put("available", ready && tts != null);
        result.put("engine", (ready && tts != null) ? tts.getDefaultEngine() : "");
        result.put("error", initError == null ? "" : initError);
        result.put("urduAvailable", languageAvailable(new Locale("ur", "PK"))
                || languageAvailable(new Locale("ur", "IN"))
                || languageAvailable(new Locale("ur")));
        JSArray list = new JSArray();
        if (ready && tts != null) {
            for (Voice voice : tts.getVoices()) list.put(voiceJson(voice));
        }
        result.put("voices", list);
        return result;
    }

    @PluginMethod()
    public void status(PluginCall call) {
        whenReady(call, () -> call.resolve(statusJson()));
    }

    @PluginMethod()
    public void voices(PluginCall call) {
        whenReady(call, () -> call.resolve(statusJson()));
    }

    @PluginMethod()
    public void speak(PluginCall call) {
        whenReady(call, () -> {
            String text = call.getString("text", "");
            if (text == null || text.trim().isEmpty()) {
                call.reject("No text to speak");
                return;
            }
            String lang = call.getString("lang", "ur-PK");
            String chosenLang = chooseLanguage(lang);
            if (chosenLang == null) {
                call.reject("The Urdu voice pack is not installed on this device");
                return;
            }
            Locale locale = urdu(lang) ? new Locale("ur", "PK") : Locale.UK;
            Voice voice = chooseVoice(call.getString("voiceURI"), locale);
            if (voice != null) {
                tts.setVoice(voice);
                chosenLang = voice.getLocale().toString().replace('_', '-');
            }
            float rate = call.getFloat("rate", 0.95f);
            float pitch = call.getFloat("pitch", 1.0f);
            tts.setSpeechRate(Math.max(0.5f, Math.min(1.5f, rate)));
            tts.setPitch(Math.max(0.5f, Math.min(1.5f, pitch)));
            tts.stop();
            String id = "lumina-" + (++utteranceSeq);
            int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
            JSObject response = new JSObject();
            response.put("spoken", result == TextToSpeech.SUCCESS);
            response.put("lang", chosenLang);
            response.put("voice", voice == null ? "" : voice.getName());
            Log.i(TAG, "speak " + id + " lang=" + chosenLang + " voice=" + response.getString("voice") + " chars=" + text.length());
            if (result == TextToSpeech.SUCCESS) call.resolve(response);
            else call.reject("Device speech could not start (" + result + ")");
        });
    }

    @PluginMethod()
    public void stop(PluginCall call) {
        if (tts != null) tts.stop();
        call.resolve();
    }
}
