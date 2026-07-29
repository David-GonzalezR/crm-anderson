(function () {
  const contact = {
    firstName: "Ingeniería",
    lastName: "y Suministros",
    fullName: "Ingeniería & Suministros",
    org: "I&S — Ingeniería & Suministros",
    title: "Soluciones en Ingeniería y Suministros",
    phone: "+573212922703",
    email: "contacto@ing-suministros.com",
    website: window.location.origin + "/",
    address: "Calle 50 #25-30, Medellín, Colombia",
  };

  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function buildVCard(c) {
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${c.lastName};${c.firstName};;;`,
      `FN:${c.fullName}`,
      `ORG:${c.org}`,
      `TITLE:${c.title}`,
      `TEL;TYPE=CELL,VOICE:${c.phone}`,
      `EMAIL;TYPE=INTERNET:${c.email}`,
      `URL:${c.website}`,
      `ADR;TYPE=WORK:;;${c.address};;;;`,
      "END:VCARD",
    ].join("\r\n");
  }

  async function downloadVCard() {
    const vcf = buildVCard(contact);
    const fileName = `Ingenieria_y_Suministros.vcf`;

    let shared = false;
    if (navigator.canShare) {
      try {
        const file = new File([vcf], fileName, { type: "text/vcard" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Guardar Contacto',
          });
          toast("Contacto procesado");
          shared = true;
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error("Web Share API falló:", err);
      }
    }

    if (!shared) {
      try {
        const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast("Descargado. Revisa tus notificaciones.");
      } catch (e) {
        const vcardModal = document.getElementById('vcardFallbackModal');
        if(vcardModal) vcardModal.classList.add('show');
      }
    }
  }

  async function shareCard() {
    const shareData = {
      title: contact.fullName,
      text: `${contact.fullName} — ${contact.title}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (_) { }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast("Enlace copiado al portapapeles");
      } catch (_) {
        toast("No se pudo compartir");
      }
    } else {
      toast("Compartir no disponible");
    }
  }

  function setupModals() {
    const vcardModal = document.getElementById('vcardFallbackModal');
    const closeVCardBtn = document.getElementById('closeVCardModal');
    const copyVCardData = document.getElementById('copyVCardData');

    if(closeVCardBtn) {
      closeVCardBtn.addEventListener('click', () => {
        vcardModal.classList.remove('show');
      });
    }

    if(copyVCardData) {
      copyVCardData.addEventListener('click', async () => {
        const textToCopy = `Empresa: ${contact.fullName}\nTeléfono: ${contact.phone}\nEmail: ${contact.email}`;
        try {
          await navigator.clipboard.writeText(textToCopy);
          toast("Datos copiados");
          vcardModal.classList.remove('show');
        } catch (err) {
          toast("Error al copiar");
        }
      });
    }

    const iosInstallModal = document.getElementById('iosInstallModal');
    const closeIosInstall = document.getElementById('closeIosInstall');
    if(closeIosInstall) {
      closeIosInstall.addEventListener('click', () => {
        iosInstallModal.classList.remove('show');
      });
    }
  }

  function registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(registration => console.log('SW registered: ', registration.scope))
          .catch(err => console.log('SW registration failed: ', err));
      });
    }

    let deferredPrompt;
    const installAppBtn = document.getElementById('installAppBtn');
    const iosInstallModal = document.getElementById('iosInstallModal');

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (!installAppBtn) return;

    if (isStandalone) {
      installAppBtn.style.display = 'none';
      return;
    }

    if (isIOS) {
      installAppBtn.addEventListener('click', () => {
        if(iosInstallModal) iosInstallModal.classList.add('show');
      });
    } else {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
      });

      installAppBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            installAppBtn.style.display = 'none';
          }
          deferredPrompt = null;
        } else {
          toast("Usa la opción 'Instalar' o 'Añadir a inicio' del navegador");
        }
      });

      window.addEventListener('appinstalled', () => {
        installAppBtn.style.display = 'none';
        deferredPrompt = null;
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const save = document.getElementById("saveContact");
    const share = document.getElementById("shareCard");
    if (save) save.addEventListener("click", downloadVCard);
    if (share) share.addEventListener("click", shareCard);

    setupModals();
    registerPWA();

    const form = document.getElementById("contactForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;

        const data = new FormData(form);
        const name = data.get("nombre");
        const email = data.get("email");
        const tel = data.get("telefono") || "No especificado";
        const msg = data.get("mensaje");

        try {
          const response = await fetch("https://formsubmit.co/ajax/davi.gr7@gmail.com", {
            method: "POST",
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              _subject: `Nueva cotización de ${name}`,
              _template: "table",
              Nombre: name,
              Correo: email,
              Teléfono: tel,
              Mensaje: msg
            })
          });

          if (response.ok) {
            toast("¡Mensaje enviado con éxito!");
            form.innerHTML = `
              <div style="text-align: center; padding: 20px;">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--neon)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h2 style="margin:0 0 10px;">¡Gracias por contactarnos!</h2>
                <p style="color: var(--muted); font-size: 14px;">Hemos recibido tu mensaje. Te contactaremos a la brevedad.</p>
                <button type="button" onclick="location.reload()" style="margin-top: 15px; width: auto; padding: 10px 20px;">Volver</button>
              </div>
            `;
          } else {
            throw new Error("Respuesta no válida del servidor");
          }
        } catch (error) {
          toast("Hubo un error al enviar. Inténtalo de nuevo.");
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });
    }
  });
})();
