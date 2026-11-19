package com.luminavoice.app;

import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UrduTtsPlugin.class);
        super.onCreate(savedInstanceState);
        // The app runs from https://localhost but the cron-published catalogue
        // snapshot lives on the private LAN over plain HTTP. Allow that one
        // cleartext fetch in the native WebView; remote content stays HTTPS.
        getBridge().getWebView().getSettings()
                .setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
}
