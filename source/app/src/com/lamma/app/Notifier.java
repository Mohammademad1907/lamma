package com.lamma.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Shows Lamma notifications and remembers which inbox notes were already shown, so none appears twice. */
final class Notifier {
    static final String PREFS = "lamma.notify";
    private static final String CHANNEL = "orders";
    private static final int FLAG_IMMUTABLE = 0x04000000; // PendingIntent.FLAG_IMMUTABLE (API 23, required on 31+)

    private Notifier() { }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Creates the notification channel on Android 8+ (classes are newer than the API 23 build jar, so via reflection). */
    private static Notification.Builder builder(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            try {
                Class<?> chCls = Class.forName("android.app.NotificationChannel");
                Object ch = chCls.getConstructor(String.class, CharSequence.class, int.class)
                        .newInstance(CHANNEL, "Orders", 4 /* IMPORTANCE_HIGH */);
                chCls.getMethod("setDescription", String.class).invoke(ch, "People joining, orders locking or delivered, payment reminders");
                NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
                NotificationManager.class.getMethod("createNotificationChannel", chCls).invoke(nm, ch);
                return Notification.Builder.class.getConstructor(Context.class, String.class).newInstance(c, CHANNEL);
            } catch (Exception ignored) { }
        }
        return new Notification.Builder(c);
    }

    static void show(Context c, String key, String title, String body, String orderId) {
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("lamma://order?o=" + (orderId == null ? "" : orderId)), c, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, key.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE);
        Notification.Builder b = builder(c)
                .setSmallIcon(R.drawable.ic_notify)
                .setColor(0xFFE8552D)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(Notification.PRIORITY_HIGH)
                .setDefaults(Notification.DEFAULT_ALL)
                .setContentIntent(pi);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        try { nm.notify(key.hashCode(), b.build()); } catch (Exception ignored) { }
    }

    /** True the first time an inbox note id is seen; remembers the last 300 ids. */
    static synchronized boolean firstTime(Context c, String id) {
        SharedPreferences p = prefs(c);
        String all = p.getString("seen", "");
        List<String> ids = new ArrayList<>(Arrays.asList(all.isEmpty() ? new String[0] : all.split(",")));
        if (ids.contains(id)) return false;
        ids.add(id);
        while (ids.size() > 300) ids.remove(0);
        StringBuilder sb = new StringBuilder();
        for (String s : ids) { if (sb.length() > 0) sb.append(','); sb.append(s); }
        p.edit().putString("seen", sb.toString()).apply();
        return true;
    }
}
