#!/usr/bin/env bash
# Gera o APK debug do Nubi com Capacitor 6 (rodar no Linux/WSL com JDK 17,
# Node 20+ e Android SDK em $ANDROID_HOME, padrão ~/android-sdk).
#   bash scripts/build-apk.sh            # usa ~/nubi-apk como projeto Capacitor
#   APP_DIR=/outro/caminho bash scripts/build-apk.sh
# Na primeira execução cria o projeto Capacitor; depois só copia o jogo e compila.
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP="${APP_DIR:-$HOME/nubi-apk}"
APP_ID="dev.joaovictorsouza.nubi"

if [ ! -d "$APP/android" ]; then
  echo "=== criando projeto Capacitor em $APP ==="
  mkdir -p "$APP/www" && cd "$APP"
  [ -f package.json ] || printf '{ "name": "nubi-casa-magica", "version": "1.0.0", "private": true }\n' > package.json
  npm install --no-audit --no-fund @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
  printf '{ "appId": "%s", "appName": "Nubi e a Casa Magica", "webDir": "www" }\n' "$APP_ID" > capacitor.config.json
  npx cap add android
  printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
fi

echo "=== copiando o jogo ==="
cd "$APP"
rm -rf www && mkdir -p www
cp -r "$SRC/index.html" "$SRC/manifest.webmanifest" "$SRC/sw.js" "$SRC/src" "$SRC/assets" www/
npx cap copy android

echo "=== compilando ==="
cd android
./gradlew clean assembleDebug --no-daemon -q
APK="$APP/android/app/build/outputs/apk/debug/app-debug.apk"
AAPT="$(ls -d "$ANDROID_HOME"/build-tools/*/ | sort -V | tail -1)aapt"
"$AAPT" dump badging "$APK" | grep -E "^package:|application-label:|sdkVersion|targetSdk"
cp "$APK" "$SRC/nubi-casa-magica-debug.apk"
echo "APK: $SRC/nubi-casa-magica-debug.apk"
