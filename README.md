# Lamma

Order food together with friends and split the bill fairly. Android app plus the small web pages it uses.

- `Lamma.apk`: the latest Android build (also downloadable from https://mohammademad1907.github.io/lamma/)
- `j/`: invite link page (`/j/?c=CODE`) that opens the app
- `app/`: the same app as a web app, for iPhone and computers (open in Safari, then Add to Home Screen)
- `auth/`: Google sign-in page; the app opens it in the browser because Google blocks sign-in inside app web views
- `source/`: app source. `source/app` is the Android shell and the web app it loads, `source/web/firestore.rules` the Firestore security rules, `source/build.sh` the build script.
