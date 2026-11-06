#!/usr/bin/env bash
# Gera o app Android da Casa da Nubi com Capacitor 7 (rodar no Linux/WSL com
# JDK 21, Node 20+ e Android SDK em $ANDROID_HOME, padrão ~/android-sdk, com a
# plataforma android-36 instalada).
#   bash scripts/build-apk.sh                 # APK de teste (debug)
#   RELEASE=1 VERSION_CODE=2 VERSION_NAME=1.1 bash scripts/build-apk.sh
#                                             # pacote da Play Store (.aab assinado)
#   APP_DIR=/outro/caminho bash scripts/build-apk.sh
# Na primeira execução cria o projeto Capacitor; depois só copia o jogo e compila.
# A chave de envio da Play Store fica FORA do repositório, em ~/nubi-keys/
# (upload.jks + upload.properties). Faça backup dela: sem ela não dá para
# enviar atualizações (o Google guarda a chave do app, mas trocar a de envio
# exige pedido ao suporte).
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
# o Capacitor 7 compila com Java 21 (use o JDK 21 em ~/jdk21 se o do sistema for mais antigo)
if [ -x "$HOME/jdk21/bin/java" ]; then export JAVA_HOME="$HOME/jdk21"; export PATH="$JAVA_HOME/bin:$PATH"; fi
SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP="${APP_DIR:-$HOME/nubi-apk}"
APP_ID="dev.joaovictorsouza.nubi"
APP_NAME="Casa da Nubi"

if [ ! -d "$APP/android" ]; then
  echo "=== criando projeto Capacitor em $APP ==="
  mkdir -p "$APP/www" && cd "$APP"
  [ -f package.json ] || printf '{ "name": "nubi-casa-magica", "version": "1.0.0", "private": true }\n' > package.json
  npm install --no-audit --no-fund @capacitor/core@7 @capacitor/cli@7 @capacitor/android@7
  printf '{ "appId": "%s", "appName": "%s", "webDir": "www" }\n' "$APP_ID" "$APP_NAME" > capacitor.config.json
  echo "<!doctype html>" > www/index.html   # o "cap add" exige uma página (o jogo entra depois)
  npx cap add android
  printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
fi

echo "=== copiando o jogo ==="
cd "$APP"
# a voz sintetizada saiu (soava robótica; src/systems/voice.js só toca
# gravações): tira o plugin de TTS de projetos criados antes
if grep -q '"@capacitor-community/text-to-speech"' package.json; then npm uninstall --no-audit --no-fund @capacitor-community/text-to-speech; fi
# nome e ícone sempre sincronizados com o repositório (também em projetos já criados)
printf '{ "appId": "%s", "appName": "%s", "webDir": "www" }\n' "$APP_ID" "$APP_NAME" > capacitor.config.json
STRINGS=android/app/src/main/res/values/strings.xml
sed -i -E "s#(<string name=\"(app_name|title_activity_main)\">)[^<]*#\1$APP_NAME#" "$STRINGS"
RES=android/app/src/main/res
rm -f "$RES"/mipmap-anydpi-v26/ic_launcher*.xml "$RES"/mipmap-*/ic_launcher*.webp
cp -r "$SRC"/android-res/. "$RES"/
# o app é sempre paisagem: o Android trava a orientação (as duas paisagens,
# conforme o sensor), então a página nunca precisa pedir "gire o celular"
MANIFEST=android/app/src/main/AndroidManifest.xml
sed -i -E 's# android:screenOrientation="[^"]*"##g' "$MANIFEST"
sed -i -E 's#(android:name="\.MainActivity")#\1 android:screenOrientation="sensorLandscape"#' "$MANIFEST"
# tela cheia imersiva (sem barras do Android) + recorte da câmera repassado à página
cp "$SRC/android-src/MainActivity.java" "android/app/src/main/java/${APP_ID//.//}/MainActivity.java"
# Google Play: apps novos precisam mirar o Android mais recente (API 36)
sed -i -E 's#(compileSdkVersion|targetSdkVersion) = [0-9]+#\1 = 36#' android/variables.gradle
grep -q suppressUnsupportedCompileSdk android/gradle.properties || echo "android.suppressUnsupportedCompileSdk=36" >> android/gradle.properties
# versão (a Play Store exige um versionCode maior a cada envio)
sed -i -E "s#versionCode [0-9]+#versionCode ${VERSION_CODE:-1}#; s#versionName \"[^\"]*\"#versionName \"${VERSION_NAME:-1.0}\"#" android/app/build.gradle
# assinatura de release com a chave de envio (só existe na máquina de quem publica)
if ! grep -q "nubi-keys" android/app/build.gradle; then
  cat >> android/app/build.gradle <<'GRADLE'

// chave de envio da Play Store (fora do repositório): ~/nubi-keys/upload.properties
def nubiKeys = new File(System.getProperty("user.home"), "nubi-keys/upload.properties")
if (nubiKeys.exists()) {
    def k = new Properties()
    nubiKeys.withInputStream { k.load(it) }
    android.signingConfigs { upload { storeFile file(k.storeFile); storePassword k.storePassword; keyAlias k.keyAlias; keyPassword k.keyPassword } }
    android.buildTypes.release.signingConfig android.signingConfigs.upload
}
GRADLE
fi
rm -rf www && mkdir -p www
cp -r "$SRC/index.html" "$SRC/manifest.webmanifest" "$SRC/sw.js" "$SRC/src" "$SRC/assets" www/
npx cap sync android   # sync (não só copy): registra os plugins nativos

echo "=== compilando ==="
cd android
if [ "${RELEASE:-0}" = "1" ]; then
  [ -f "$HOME/nubi-keys/upload.properties" ] || { echo "falta a chave de envio em ~/nubi-keys/"; exit 1; }
  ./gradlew clean bundleRelease --no-daemon -q
  AAB="$APP/android/app/build/outputs/bundle/release/app-release.aab"
  cp "$AAB" "$SRC/casa-da-nubi-${VERSION_NAME:-1.0}.aab"
  echo "AAB: $SRC/casa-da-nubi-${VERSION_NAME:-1.0}.aab"
  exit 0
fi
./gradlew clean assembleDebug --no-daemon -q
APK="$APP/android/app/build/outputs/apk/debug/app-debug.apk"
AAPT="$(ls -d "$ANDROID_HOME"/build-tools/*/ | sort -V | tail -1)aapt"
"$AAPT" dump badging "$APK" | grep -E "^package:|application-label:|sdkVersion|targetSdk"
cp "$APK" "$SRC/nubi-casa-magica-debug.apk"
echo "APK: $SRC/nubi-casa-magica-debug.apk"
