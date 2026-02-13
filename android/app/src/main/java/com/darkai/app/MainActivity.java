package com.darkai.app;

import android.os.Bundle;
import android.graphics.Color;
import android.webkit.WebView;
import android.webkit.URLUtil;
import android.webkit.JavascriptInterface;
import android.app.DownloadManager;
import android.net.Uri;
import android.os.Environment;
import android.widget.Toast;
import android.util.Base64;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;

public class MainActivity extends BridgeActivity {
    
    private static final int STORAGE_PERMISSION_CODE = 100;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        setupStatusBar();
        
        // Request storage permission on start to ensure we can save files
        checkAndRequestPermissions();
        
        setupDownloadListener();
    }
    
    private void checkAndRequestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE, 
                                     Manifest.permission.READ_EXTERNAL_STORAGE},
                        STORAGE_PERMISSION_CODE);
            }
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == STORAGE_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted
            } else {
                Toast.makeText(this, "Permission required for downloads", Toast.LENGTH_SHORT).show();
            }
        }
    }
    
    private void setupStatusBar() {
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.parseColor("#0b0c0f"));
    }
    
    private void setupDownloadListener() {
        WebView webView = getBridge().getWebView();
        
        // Add Interface for Blob URLs
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void downloadBlob(String base64Data, String mimeType) {
                try {
                    String filename = "download_" + System.currentTimeMillis();
                    
                    // Simple extension guessing
                    if (mimeType.contains("pdf")) filename += ".pdf";
                    else if (mimeType.contains("png")) filename += ".png";
                    else if (mimeType.contains("jpg")) filename += ".jpg";
                    else if (mimeType.contains("zip")) filename += ".zip";
                    else filename += ".bin";

                    byte[] data = Base64.decode(base64Data.split(",")[1], Base64.DEFAULT);
                    
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File file = new File(downloadsDir, filename);
                    
                    FileOutputStream fos = new FileOutputStream(file);
                    fos.write(data);
                    fos.close();
                    
                    // Notify system of new file
                    DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    dm.addCompletedDownload(filename, "Dark AI Download", true, mimeType, file.getAbsolutePath(), file.length(), true);
                    
                    runOnUiThread(() -> 
                        Toast.makeText(getApplicationContext(), "Saved to Downloads: " + filename, Toast.LENGTH_LONG).show()
                    );
                    
                } catch (Exception e) {
                    runOnUiThread(() -> 
                        Toast.makeText(getApplicationContext(), "Error saving file: " + e.getMessage(), Toast.LENGTH_LONG).show()
                    );
                }
            }
        }, "AndroidDownloader");
        
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url.startsWith("blob:")) {
                String js = "javascript:(function() {" +
                        "  var xhr = new XMLHttpRequest();" +
                        "  xhr.open('GET', '" + url + "', true);" +
                        "  xhr.responseType = 'blob';" +
                        "  xhr.onload = function() {" +
                        "    if (this.status == 200) {" +
                        "      var blob = this.response;" +
                        "      var reader = new FileReader();" +
                        "      reader.onloadend = function() {" +
                        "        AndroidDownloader.downloadBlob(reader.result, '" + mimeType + "');" +
                        "      };" +
                        "      reader.readAsDataURL(blob);" +
                        "    }" +
                        "  };" +
                        "  xhr.send();" +
                        "})()";
                webView.evaluateJavascript(js, null);
            } else {
                // Regular http download
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    
                    request.setMimeType(mimeType);
                    request.addRequestHeader("User-Agent", userAgent);
                    request.setDescription("Downloading content...");
                    request.setTitle(filename);
                    request.allowScanningByMediaScanner();
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    
                    DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    dm.enqueue(request);
                    
                    Toast.makeText(getApplicationContext(), "Downloading...", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(getApplicationContext(), "Download Error", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }
}
