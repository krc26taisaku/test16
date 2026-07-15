
window.KenteiDrawer = (() => {
  const drawer = () => document.getElementById("drawer");
  const backdrop = () => document.getElementById("drawerBackdrop");

  function open() {
    if(window.KenteiSettings)KenteiSettings.applyMenu();
    drawer().classList.add("open");
    backdrop().classList.add("open");
    drawer().setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    drawer().classList.remove("open");
    backdrop().classList.remove("open");
    drawer().setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  return { open, close };
})();
