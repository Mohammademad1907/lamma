#!/bin/bash
# Builds Lamma APK without Gradle: aapt -> javac -> dx -> aapt add -> zipalign -> apksigner
set -euo pipefail
cd "$(dirname "$0")"
SDK=/usr/lib/android-sdk
BT=$SDK/build-tools/29.0.3
JAR=$SDK/platforms/android-23/android.jar
KS=${KEYSTORE:-/mnt/project-files/lamma/lamma-release.keystore}
OUT=build
rm -rf $OUT && mkdir -p $OUT/gen $OUT/classes
aapt package -f -m -J $OUT/gen -M app/AndroidManifest.xml -S app/res -I $JAR
javac -nowarn --release 8 -cp $JAR -d $OUT/classes $(find app/src $OUT/gen -name '*.java') 2>$OUT/javac.log || { cat $OUT/javac.log; exit 1; }
$BT/dx --dex --output=$OUT/classes.dex $OUT/classes
aapt package -f -M app/AndroidManifest.xml -S app/res -A app/assets -I $JAR -F $OUT/unsigned.apk
(cd $OUT && aapt add -f unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 $OUT/unsigned.apk $OUT/aligned.apk
if [ ! -f "$KS" ]; then
  mkdir -p "$(dirname "$KS")"
  keytool -genkeypair -keystore "$KS" -storepass lamma123 -keypass lamma123 -alias lamma \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Lamma, O=Lamma, C=EG" >/dev/null 2>&1
fi
apksigner sign --ks "$KS" --ks-pass pass:lamma123 --key-pass pass:lamma123 --ks-key-alias lamma \
  --min-sdk-version 24 --out $OUT/Lamma.apk $OUT/aligned.apk
apksigner verify --verbose $OUT/Lamma.apk | head -5
ls -la $OUT/Lamma.apk
