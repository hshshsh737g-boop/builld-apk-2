package com.darkai.app;

import android.os.Bundle;
import android.graphics.Color;
import android.webkit.WebView;
import android.webkit.URLUtil;
import android.webkit.JavascriptInterface;
import android.webkit.WebViewClient;
import android.app.DownloadManager;
import android.net.Uri;
import android.os.Environment;
import android.widget.Toast;
import android.util.Base64;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        setupStatusBar();
        setupDownloadHandler();
    }
    
    private void setupStatusBar() {
        // Transparent status bar
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.parseColor("#0b0c0f"));
    }
    
    private void setupDownloadHandler() {
        WebView webView = getBridge().getWebView();
        
        // Add JavaScript interface for blob downloads
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void downloadBlob(String base64Data, String filename, String mimeType) {
                try {
                    // Decode base64
                    byte[] data = Base64.decode(base64Data.split(",")[1], Base64.DEFAULT);
                    
                    // Save to Downloads directory
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File file = new File(downloadsDir, filename);
                    
                    FileOutputStream fos = new FileOutputStream(file);
                    fos.write(data);
                    fos.close();
                    
                    runOnUiThread(() -> {
                        Toast.makeText(getApplicationContext(), "Downloaded: " + filename, Toast.LENGTH_LONG).show();
                    });
                    
                } catch (Exception e) {
                    runOnUiThread(() -> {
                        Toast.makeText(getApplicationContext(), "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    });
                }
            }
        }, "AndroidDownloader");
        
        // Handle regular download links
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            // Check if it's a blob URL
            if (url.startsWith("blob:")) {
                // Inject JavaScript to read blob and send to Android
                String js = "(function() {" +
                        "  fetch('" + url + "')" +
                        "    .then(res => res.blob())" +
                        "    .then(blob => {" +
                        "      const reader = new FileReader();" +
                        "      reader.onloadend = function() {" +
                        "        const filename = '" + System.currentTimeMillis() + ".bin';" +
                        "        AndroidDownloader.downloadBlob(reader.result, filename, blob.type);" +
                        "      };" +
                        "      reader.readAsDataURL(blob);" +
                        "    })" +
                        "    .catch(err => console.error('Blob download error:', err));" +
                        "})();";
                
                webView.evaluateJavascript(js, null);
                return;
            }
            
            // Handle regular URLs
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                
                request.setMimeType(mimeType);
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("Downloading file...");
                request.setTitle(filename);
                request.allowScanningByMediaScanner();
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                
                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                dm.enqueue(request);
                
                Toast.makeText(getApplicationContext(), "Downloading " + filename, Toast.LENGTH_LONG).show();
                
            } catch (Exception e) {
                Toast.makeText(getApplicationContext(), "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }
}
