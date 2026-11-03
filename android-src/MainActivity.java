package dev.joaovictorsouza.nubi;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.Locale;

/* Tela cheia de verdade (copiada pelo scripts/build-apk.sh):
   - esconde a barra de status e a de navegação do Android (modo imersivo;
     deslizar da borda mostra as barras só por um instante);
   - o jogo desenha também ao lado do recorte da câmera (notch/furo);
   - avisa a página do tamanho desse recorte (--nat-l/r/t/b, em px CSS) para
     os botões não ficarem embaixo dele. Muda quando o aparelho gira 180°. */
public class MainActivity extends BridgeActivity {
  private Insets cutout = Insets.NONE;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      WindowManager.LayoutParams lp = getWindow().getAttributes();
      lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
      getWindow().setAttributes(lp);
    }
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    View decor = getWindow().getDecorView();
    ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
      cutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
      pushInsets();
      return ViewCompat.onApplyWindowInsets(v, insets);
    });
    bridge.addWebViewListener(new WebViewListener() {
      @Override
      public void onPageLoaded(WebView webView) { pushInsets(); }
    });
    hideSystemBars();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) hideSystemBars();
  }

  private void hideSystemBars() {
    WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
    c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    c.hide(WindowInsetsCompat.Type.systemBars());
  }

  private void pushInsets() {
    if (bridge == null || bridge.getWebView() == null) return;
    float d = getResources().getDisplayMetrics().density;
    String js = String.format(Locale.US,
      "(function(s){s.setProperty('--nat-l','%.1fpx');s.setProperty('--nat-r','%.1fpx');s.setProperty('--nat-t','%.1fpx');s.setProperty('--nat-b','%.1fpx');window.dispatchEvent(new Event('resize'));})(document.documentElement.style)",
      cutout.left / d, cutout.right / d, cutout.top / d, cutout.bottom / d);
    WebView wv = bridge.getWebView();
    wv.post(() -> wv.evaluateJavascript(js, null));
  }
}
