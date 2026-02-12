package com.darkai.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
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
        
        // Inject CSS to fix status bar overlap
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                
                // Add padding for status bar
                int statusBarHeight = getStatusBarHeight();
                view.evaluateJavascript(
                    "javascript:(function() {" +
                    "var style = document.createElement('style');" +
                    "style.innerHTML = 'body { padding-top: " + statusBarHeight + "px !important; }';" +
                    "document.head.appendChild(style);" +
                    "})();", null
                );
            }
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
