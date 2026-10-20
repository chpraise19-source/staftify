# STAFTIFY interactive preview

`staftify-demo.html` is a generated, self-contained copy of the current interactive demo. Download/open it in a browser to explore Facility, Nurse, and Admin without an account or server. All code, styles and icons are included; no external network calls are made by the demo. Browser sample data persists locally when storage is available.

`staftify-desktop.png` and `staftify-mobile.png` show the running application. The HTML is included here for portable review while hosting is deferred; source code remains in `src/components/demo` and `src/lib/demo`. Regenerate the HTML using the repository's `preview:export` script rather than editing the generated file. The browser smoke suite tests the generated HTML with network requests blocked.
