package com.darkai.app;

import android.os.Bundle;
import android.graphics.Color;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.CookieManager;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        setupStatusBar();
        setupWebView();
    }
    
    private void setupStatusBar() {
        // Transparent status bar
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.parseColor("#0b0c0f"));
    }
    
    private void setupWebView() {
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        
        // Enable storage APIs
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // Enable cookies with third-party support
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        
        // Cache settings for better performance
        settings.setAppCacheEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Hardware acceleration for smoother rendering
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        
        // Additional performance tweaks
        settings.setLoadsImagesAutomatically(true);
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        // Flush cookies to disk when app goes to background
        CookieManager.getInstance().flush();
    }
}
