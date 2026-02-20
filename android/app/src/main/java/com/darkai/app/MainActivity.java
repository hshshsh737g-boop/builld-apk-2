package com.darkai.app;

import android.os.Bundle;
import android.graphics.Color;
import android.os.Build;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.CookieManager;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private WebView webView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Render before drawing - smoother startup
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        setupStatusBar();
        setupWebView();
    }

    private void setupStatusBar() {
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.parseColor("#0b0c0f"));
    }

    private void setupWebView() {
        webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // ── Storage ──────────────────────────────
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // ── Cookies ──────────────────────────────
        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        // ── Cache ────────────────────────────────
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // ── Rendering ────────────────────────────
        // Hardware layer = GPU compositing for smooth scrolling
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Scroll smoothness
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        // ── Content ──────────────────────────────
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Text rendering clarity
        settings.setTextZoom(100);

        // Larger viewport for proper mobile layout
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // ── Network ──────────────────────────────
        // Allow mixed content (http in https pages)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }

    // ── Lifecycle: pause/resume to free resources ──────────────────────

    @Override
    public void onPause() {
        super.onPause();
        if (webView != null) {
            // Suspend JS timers, animations, video playback - frees CPU/GPU
            webView.onPause();
            webView.pauseTimers();
        }
        CookieManager.getInstance().flush();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (webView != null) {
            // Resume everything when user comes back
            webView.resumeTimers();
            webView.onResume();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (webView != null) {
            // When activity is fully hidden, switch to software layer
            // (reduces GPU memory while not visible)
            webView.setLayerType(View.LAYER_TYPE_NONE, null);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (webView != null) {
            // Re-enable hardware layer when visible again
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        }
    }

    @Override
    public void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.clearCache(false);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
