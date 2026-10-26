package com.lamma.app;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** Every 15 minutes, even when Lamma is closed: reads the person's inbox from Firestore and shows new notes. */
public class InboxJob extends JobService {
    private static final int JOB_ID = 4711;

    static void schedule(Context c) {
        SharedPreferences p = Notifier.prefs(c);
        JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (p.getString("refresh", "").isEmpty()) { js.cancel(JOB_ID); return; }
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(c, InboxJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build();
        try { js.schedule(job); } catch (Exception ignored) { }
    }

    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try { check(InboxJob.this); } catch (Exception ignored) { }
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) { return true; }

    static void check(Context c) throws Exception {
        SharedPreferences p = Notifier.prefs(c);
        String refresh = p.getString("refresh", ""), uid = p.getString("uid", ""), key = p.getString("apiKey", ""), project = p.getString("project", "");
        long since = p.getLong("since", 0);
        if (refresh.isEmpty() || uid.isEmpty() || p.getBoolean("emulator", false)) return;

        // swap the saved sign-in for a fresh access token
        JSONObject tok = new JSONObject(post("https://securetoken.googleapis.com/v1/token?key=" + key,
                "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(refresh, "UTF-8")));
        String idToken = tok.getString("id_token");
        if (tok.has("refresh_token")) p.edit().putString("refresh", tok.getString("refresh_token")).apply();

        String url = "https://firestore.googleapis.com/v1/projects/" + project + "/databases/(default)/documents/users/"
                + uid + "/inbox?pageSize=20&orderBy=" + URLEncoder.encode("at desc", "UTF-8");
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setRequestProperty("Authorization", "Bearer " + idToken);
        h.setConnectTimeout(15000); h.setReadTimeout(15000);
        if (h.getResponseCode() != 200) return;
        JSONObject res = new JSONObject(read(h.getInputStream()));
        JSONArray docs = res.optJSONArray("documents");
        if (docs == null) return;
        for (int i = docs.length() - 1; i >= 0; i--) {
            JSONObject d = docs.getJSONObject(i);
            JSONObject f = d.getJSONObject("fields");
            String name = d.getString("name");
            String id = name.substring(name.lastIndexOf('/') + 1);
            boolean read = f.has("read") && f.getJSONObject("read").optBoolean("booleanValue", false);
            long at = f.has("at") ? Long.parseLong(f.getJSONObject("at").optString("integerValue", f.getJSONObject("at").optString("doubleValue", "0").split("\\.")[0])) : 0;
            if (read || at < since) continue;
            if (!Notifier.firstTime(c, id)) continue;
            Notifier.show(c, id, str(f, "title"), str(f, "body"), str(f, "orderId"));
        }
    }

    private static String str(JSONObject f, String k) {
        return f.has(k) ? f.optJSONObject(k).optString("stringValue", "") : "";
    }

    private static String post(String url, String body) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setRequestMethod("POST");
        h.setDoOutput(true);
        h.setConnectTimeout(15000); h.setReadTimeout(15000);
        h.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        OutputStream os = h.getOutputStream();
        os.write(body.getBytes(StandardCharsets.UTF_8));
        os.close();
        return read(h.getInputStream());
    }

    private static String read(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }
}
