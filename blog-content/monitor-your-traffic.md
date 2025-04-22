# Monitor your traffic with Matomo

... Explain why it is important to monitor traffic ...

Head on to Matomo - https://matomo.org/.

### Add Script

```html
<!-- Matomo -->
<script>
  var _paq = (window._paq = window._paq || []);
  /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
  _paq.push(["trackPageView"]);
  _paq.push(["enableLinkTracking"]);
  (function () {
    var u = "https://vvasylkovskyi.matomo.cloud/";
    _paq.push(["setTrackerUrl", u + "matomo.php"]);
    _paq.push(["setSiteId", "1"]);
    var d = document,
      g = d.createElement("script"),
      s = d.getElementsByTagName("script")[0];
    g.async = true;
    g.src = "//cdn.matomo.cloud/vvasylkovskyi.matomo.cloud/matomo.js";
    s.parentNode.insertBefore(g, s);
  })();
</script>
<!-- End Matomo Code -->
```

### Check your stats

- https://vvasylkovskyi.matomo.cloud/

## Alternatives - StatsCounter

Go to a website - https://statcounter.com/

### Install JS

```html
<!-- Default Statcounter code for Web Blog https://webblog.vvasylkovskyi.com -->
<script type="text/javascript">
  var sc_project = 12936875;
  var sc_invisible = 1;
  var sc_security = "74dfccaa";
</script>
<script
  type="text/javascript"
  src="https://www.statcounter.com/counter/counter.js"
  async
></script>
<noscript
  ><div class="statcounter">
    <a title="Web Analytics" href="https://statcounter.com/" target="_blank"
      ><img
        class="statcounter"
        src="https://c.statcounter.com/12936875/0/74dfccaa/1/"
        alt="Web Analytics"
        referrerpolicy="no-referrer-when-downgrade"
    /></a></div
></noscript>
<!-- End of Statcounter Code -->
```

### View Stats here

- https://statcounter.com/p12936875/summary/

## Alternatives - Open Web Analytics (OWA)

This one is an open source and can be hosted. The disadvantage is the setup time, but on the other side it gives the full controll and it is free
