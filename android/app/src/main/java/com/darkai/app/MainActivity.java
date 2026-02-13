package com.darkai.app;

import android.os.Bundle;
import android.graphics.Color;
import android.webkit.WebView;
import android.webkit.URLUtil;
import android.app.DownloadManager;
import android.net.Uri;
import android.os.Environment;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        setupStatusBar();
        setupDownloadListener();
    }
    
    private void setupStatusBar() {
        // Transparent status bar
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.parseColor("#0b0c0f"));
    }
    
    private void setupDownloadListener() {
        WebView webView = getBridge().getWebView();
        
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                
                // Get filename from URL or content-disposition
                String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                
                // Configure download
                request.setMimeType(mimeType);
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("Downloading file...");
                request.setTitle(filename);
                request.allowScanningByMediaScanner();
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                
                // Start download
                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                dm.enqueue(request);
                
                // Show toast notification
                Toast.makeText(getApplicationContext(), "Downloading " + filename, Toast.LENGTH_LONG).show();
                
            } catch (Exception e) {
                Toast.makeText(getApplicationContext(), "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }
}
