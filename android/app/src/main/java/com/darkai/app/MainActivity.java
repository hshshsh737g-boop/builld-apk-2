package com.darkai.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebResourceError;
import android.webkit.WebViewClient;
import android.graphics.Color;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayInputStream;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        setupWebView();
        setupStatusBar();
    }
    
    private void setupWebView() {
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        
        // Optimize caching for offline use
        settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // Custom WebViewClient to handle offline gracefully
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // If main page fails to load, show cached version or custom message
                if (request.isForMainFrame()) {
                    // Try to load from cache first
                    settings.setCacheMode(WebSettings.LOAD_CACHE_ONLY);
                }
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Reset cache mode after page loads
                settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
                
                // Inject CSS to fix status bar overlap
                view.evaluateJavascript(
                    "javascript:(function() {" +
                    "var style = document.createElement('style');" +
                    "style.innerHTML = 'body { padding-top: " + getStatusBarHeight() + "px !important; }';" +
                    "document.head.appendChild(style);" +
                    "})();", null
                );
            }
        });
    }
    
    private void setupStatusBar() {
        // Make status bar transparent but keep icons visible
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.BLACK);
        
        // Apply window insets properly
        WebView webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(0, 0, 0, 0); // Remove any padding
            return insets;
        });
    }
    
    private int getStatusBarHeight() {
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            return getResources().getDimensionPixelSize(resourceId);
        }
        return 0;
    }
}
