package com.lamma.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int REQ_FILES = 7;
    // Serving assets from an https origin gives the page a secure context and a real origin for Firebase.
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/index.html";

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingLink;
    private boolean pageReady;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        boolean dark = isSystemDark();
        web.setBackgroundColor(dark ? 0xFF121110 : 0xFFFAFAF9);
        setBars(dark);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "LammaNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (!url.startsWith(ORIGIN + "/assets/")) return null;
                String path = Uri.parse(url).getPath().substring("/assets/".length());
                try {
                    InputStream in = getAssets().open(path);
                    return new WebResourceResponse(mimeOf(path), "UTF-8", in);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "UTF-8", null);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith(ORIGIN)) return false;
                if (url.startsWith("lamma:")) { deliverLink(url); return true; }
                openExternal(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                flushLink();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("image/*");
                pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(pick, "Choose menu photos"), REQ_FILES);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        handleIntent(getIntent());
        web.loadUrl(HOME);
    }

    private static String mimeOf(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQ_FILES || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clip = data.getClipData();
            if (clip != null) {
                result = new Uri[clip.getItemCount()];
                for (int i = 0; i < clip.getItemCount(); i++) result[i] = clip.getItemAt(i).getUri();
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (Intent.ACTION_VIEW.equals(intent.getAction()) && data != null) deliverLink(data.toString());
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null) deliverLink(text);
        }
    }

    private void deliverLink(String link) {
        pendingLink = link;
        flushLink();
    }

    private void flushLink() {
        if (!pageReady || pendingLink == null) return;
        String js = "window.lammaLink && window.lammaLink(" + jsString(pendingLink) + ")";
        pendingLink = null;
        web.evaluateJavascript(js, null);
    }

    private static String jsString(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case ' ': b.append("\\u2028"); break;
                case ' ': b.append("\\u2029"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        return b.append('"').toString();
    }

    private boolean isSystemDark() {
        int mode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return mode == Configuration.UI_MODE_NIGHT_YES;
    }

    private void setBars(boolean dark) {
        int color = dark ? 0xFF121110 : 0xFFFAFAF9;
        getWindow().setStatusBarColor(color);
        getWindow().setNavigationBarColor(color);
        View decor = getWindow().getDecorView();
        int flags = decor.getSystemUiVisibility();
        int lightStatus = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        int lightNav = 0x10; // View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR (API 26)
        if (dark) flags &= ~lightStatus; else flags |= lightStatus;
        if (Build.VERSION.SDK_INT >= 26) { if (dark) flags &= ~lightNav; else flags |= lightNav; }
        decor.setSystemUiVisibility(flags);
        if (web != null) web.setBackgroundColor(color);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        web.evaluateJavascript("window.lammaSystemDark && window.lammaSystemDark()", null);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.lammaBack ? String(window.lammaBack()) : 'false'", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (!"\"true\"".equals(value) && !"true".equals(value)) MainActivity.super.onBackPressed();
            }
        });
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "No app can open this link", Toast.LENGTH_SHORT).show();
        }
    }

    private class Bridge {
        @JavascriptInterface
        public void share(String text) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(send, "Share via"));
        }

        @JavascriptInterface
        public void copy(String text) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("Lamma", text));
        }

        @JavascriptInterface
        public void openUrl(String url) {
            openExternal(url);
        }

        @JavascriptInterface
        public boolean isSystemDark() {
            return MainActivity.this.isSystemDark();
        }

        @JavascriptInterface
        public void setBars(final boolean dark) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { MainActivity.this.setBars(dark); }
            });
        }

        /** Saves a text file to Downloads/Lamma (Android 10+), otherwise shares it. Returns true if saved. */
        @JavascriptInterface
        public boolean saveFile(String name, String mime, String content) {
            if (Build.VERSION.SDK_INT >= 29) {
                try {
                    ContentResolver r = getContentResolver();
                    ContentValues cv = new ContentValues();
                    cv.put("_display_name", name);
                    cv.put("mime_type", mime);
                    cv.put("relative_path", "Download/Lamma"); // MediaColumns.RELATIVE_PATH (API 29)
                    // MediaStore.Downloads.EXTERNAL_CONTENT_URI (API 29)
                    Uri uri = r.insert(Uri.parse("content://media/external/downloads"), cv);
                    if (uri == null) return false;
                    OutputStream os = r.openOutputStream(uri);
                    // BOM so Excel reads UTF-8 (Arabic names) correctly
                    os.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
                    os.write(content.getBytes(StandardCharsets.UTF_8));
                    os.close();
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
            share(content);
            return false;
        }
    }
}
