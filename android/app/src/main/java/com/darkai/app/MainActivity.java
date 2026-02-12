package com.darkai.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable edge-to-edge and fix status bar overlap
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // Make status bar transparent
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        
        // Configure WebView for aggressive caching (like Brave)
        WebView webView = getBridge().getWebView();
        WebSettings webSettings = webView.getSettings();
        
        // Enable ALL modern caching modes
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        
        // Enable offline mode - serve from cache when no network
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // Add padding to avoid status bar overlap
        webView.setPadding(0, getStatusBarHeight(), 0, 0);
    }
    
    private int getStatusBarHeight() {
        int result = 0;
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            result = getResources().getDimensionPixelSize(resourceId);
        }
        return result;
    }
}
