# Android Client — Development Setup

## Prerequisites (both emulator and physical device)

| Tool | Version | Purpose |
|------|---------|---------|
| **JDK** | 17 or 21 | Compile Kotlin/Gradle |
| **Android Studio** | Hedgehog or later | IDE + SDK Manager + AVD Manager + ADB |

Download links:
- JDK 21: https://adoptium.net/
- Android Studio: https://developer.android.com/studio

Inside Android Studio → SDK Manager, install:
- Android SDK Platform **API 34**
- Android Emulator
- Android SDK Platform-Tools

---

## Option 1: Emulator

### Hardware acceleration (required for acceptable performance)

- **Intel CPU:** Install HAXM via Android Studio → SDK Manager → SDK Tools
- **AMD CPU (Windows 10 Home):** Enable *Windows Hypervisor Platform* via "Turn Windows features on or off"

### Create an AVD

Android Studio → Device Manager → Create Virtual Device:
- Device: **Pixel 6**
- System image: **API 34, x86_64**
- Minimum supported: API 26 (project `minSdk`)

### Backend URL

The emulator maps `10.0.2.2` to `localhost` on the host machine.
The app is already configured with this URL for debug builds — no changes needed as long as the Docker stack is running.

---

## Option 2: Physical device

### Enable USB debugging

1. Settings → About phone → tap **Build number** 7 times → Developer options unlocked
2. Developer options → **USB debugging: on**
3. Connect phone via USB → accept the trust prompt on the device
4. Android Studio detects the device automatically in the device selector

### Backend URL for physical device

The phone cannot use `10.0.2.2`. Choose one of:

| Option | How |
|--------|-----|
| **Local IP (easiest)** | Run `ipconfig` on the PC → find the LAN IP (e.g. `192.168.1.x`) → update `API_BASE_URL` in `android/app/build.gradle.kts` |
| **ngrok** | `ngrok http 8080` → use the generated public URL |

The phone and PC must be on the same Wi-Fi network for the local IP option.

---

## Running the app

```bash
# 1. Start the backend (from workspace root)
docker compose up -d

# 2. Build and install on connected emulator or device
cd android
./gradlew installDebug

# 3. Run unit tests
./gradlew test
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `10.0.2.2` unreachable from emulator | Ensure Docker stack is up: `docker compose ps` |
| App crashes on launch | Check `adb logcat` in Android Studio for Hilt or network errors |
| Mic button not visible | Grant `RECORD_AUDIO` permission in phone Settings → Apps → Biblioteca |
| Gradle fails on first run | `gradle-wrapper.jar` is downloaded automatically — needs internet access |
| Build error: SDK not found | Set `ANDROID_HOME` env var or create `android/local.properties` with `sdk.dir=<path>` |
