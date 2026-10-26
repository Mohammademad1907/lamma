package com.lamma.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Fires the reminders set on the phone: an order locking soon, locked, or a payment still due. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String key = i.getStringExtra("key");
        if (key == null) return;
        Notifier.show(c, key, i.getStringExtra("title"), i.getStringExtra("body"), i.getStringExtra("orderId"));
    }
}
