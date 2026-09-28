let checkoutScript;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScript) return checkoutScript;
  checkoutScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    const timeout = setTimeout(failed, 15000);
    function failed() {
      clearTimeout(timeout);
      script.remove();
      checkoutScript = null;
      reject(
        new Error(
          "Could not load UPI checkout. Check your connection and retry.",
        ),
      );
    }
    script.onload = () => {
      clearTimeout(timeout);
      if (window.Razorpay) resolve();
      else failed();
    };
    script.onerror = failed;
    document.body.appendChild(script);
  });
  return checkoutScript;
}
