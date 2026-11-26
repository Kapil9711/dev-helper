/**
 * VH Logs Client Script
 * Served at http://localhost:4317/client.js and injected by `vh logs window`.
 * Transparently captures console logs, fetch requests, and XHR traffic.
 */

export const BROWSER_CLIENT_SCRIPT = `
(function () {
  if (typeof window === "undefined" || window.__VH_LOGS_CLIENT_INITIALIZED__) {
    return;
  }
  window.__VH_LOGS_CLIENT_INITIALIZED__ = true;

  var scriptTag = document.currentScript;
  var serverOrigin = (scriptTag && scriptTag.src)
    ? new URL(scriptTag.src).origin
    : (window.__VH_SERVER_ORIGIN__ || "http://localhost:4317");

  var defaultAppName = (scriptTag && scriptTag.getAttribute("data-app"))
    || window.__VH_APP_NAME__
    || window.location.host
    || window.location.hostname
    || "browser-client";

  var enableBadge = (scriptTag && scriptTag.getAttribute("data-badge") === "false")
    ? false
    : (window.__VH_DISABLE_BADGE__ !== true);

  var eventBuffer = [];
  var flushTimer = null;
  var requestCounter = 0;
  var logCounter = 0;

  function generateId(prefix) {
    return (prefix || "ev_") + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  function flushEvents() {
    if (eventBuffer.length === 0) return;
    var batch = eventBuffer.splice(0, 50);

    try {
      var payload = JSON.stringify(batch);
      if (typeof navigator.sendBeacon === "function" && batch.length <= 10) {
        var blob = new Blob([payload], { type: "application/json" });
        if (navigator.sendBeacon(serverOrigin + "/api/events", blob)) {
          return;
        }
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", serverOrigin + "/api/events", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(payload);
    } catch (e) {
      // Quiet fail if server unreachable
    }
  }

  function queueEvent(event) {
    eventBuffer.push(event);
    if (!flushTimer) {
      flushTimer = setTimeout(function () {
        flushTimer = null;
        flushEvents();
      }, 60);
    }
  }

  // 1. Console Interception
  var logLevels = ["log", "info", "warn", "error", "debug"];
  logLevels.forEach(function (level) {
    var original = console[level];
    if (typeof original !== "function") return;

    console[level] = function () {
      original.apply(console, arguments);
      logCounter++;
      updateBadge();

      var args = Array.prototype.slice.call(arguments);
      var formatted = args
        .map(function (a) {
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a, null, 2);
          } catch (e) {
            return String(a);
          }
        })
        .join(" ");

      queueEvent({
        eventId: generateId("log_"),
        appName: defaultAppName,
        timestamp: Date.now(),
        type: "log",
        level: level,
        message: formatted || "(empty log)",
        data: args.length > 1 ? args : (typeof args[0] === "object" ? args[0] : undefined),
      });
    };
  });

  // 2. Fetch API Interception
  if (typeof window.fetch === "function") {
    var originalFetch = window.fetch;
    window.fetch = function (input, init) {
      var reqId = generateId("req_");
      var method = (init && init.method ? init.method : (input instanceof Request ? input.method : "GET")).toUpperCase();
      var rawUrl = typeof input === "string" ? input : (input instanceof Request ? input.url : String(input));
      var resolvedUrl;
      try {
        resolvedUrl = new URL(rawUrl, window.location.href).href;
      } catch (e) {
        resolvedUrl = String(rawUrl);
      }

      // Ignore log server ingestion traffic to avoid loops
      if (resolvedUrl.indexOf(serverOrigin) === 0) {
        return originalFetch.apply(window, arguments);
      }

      requestCounter++;
      updateBadge();
      var startTime = Date.now();

      var headers = {};
      if (init && init.headers) {
        if (typeof Headers !== "undefined" && init.headers instanceof Headers) {
          init.headers.forEach(function (v, k) { headers[k] = v; });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(function (pair) { headers[pair[0]] = pair[1]; });
        } else if (typeof init.headers === "object") {
          headers = init.headers;
        }
      }

      var body = init ? init.body : undefined;

      queueEvent({
        eventId: generateId("nreq_"),
        appName: defaultAppName,
        timestamp: startTime,
        type: "network:req",
        requestId: reqId,
        method: method,
        url: resolvedUrl,
        headers: headers,
        body: typeof body === "string" ? body : undefined,
      });

      return originalFetch.apply(window, arguments).then(
        function (res) {
          var durationMs = Date.now() - startTime;
          var resHeaders = {};
          if (res.headers && typeof res.headers.forEach === "function") {
            res.headers.forEach(function (v, k) { resHeaders[k] = v; });
          }

          var clone = res.clone();
          clone
            .text()
            .then(function (txt) {
              queueEvent({
                eventId: generateId("nres_"),
                appName: defaultAppName,
                timestamp: Date.now(),
                type: "network:res",
                requestId: reqId,
                status: res.status,
                statusText: res.statusText,
                headers: resHeaders,
                body: txt,
                durationMs: durationMs,
              });
            })
            .catch(function () {
              queueEvent({
                eventId: generateId("nres_"),
                appName: defaultAppName,
                timestamp: Date.now(),
                type: "network:res",
                requestId: reqId,
                status: res.status,
                statusText: res.statusText,
                headers: resHeaders,
                durationMs: durationMs,
              });
            });

          return res;
        },
        function (err) {
          var durationMs = Date.now() - startTime;
          queueEvent({
            eventId: generateId("nerr_"),
            appName: defaultAppName,
            timestamp: Date.now(),
            type: "network:res",
            requestId: reqId,
            status: 0,
            error: err ? (err.message || String(err)) : "Network Error",
            durationMs: durationMs,
          });
          throw err;
        }
      );
    };
  }

  // 3. XMLHttpRequest Interception
  var OriginalXHR = window.XMLHttpRequest;
  if (OriginalXHR) {
    function CustomXHR() {
      var xhr = new OriginalXHR();
      var reqId = generateId("xhr_");
      var method = "GET";
      var url = "";
      var startTime = 0;
      var reqHeaders = {};

      var origOpen = xhr.open;
      xhr.open = function (m, u) {
        method = (m || "GET").toUpperCase();
        try {
          url = new URL(u, window.location.href).href;
        } catch (e) {
          url = String(u);
        }
        return origOpen.apply(xhr, arguments);
      };

      var origSetHeader = xhr.setRequestHeader;
      xhr.setRequestHeader = function (k, v) {
        reqHeaders[k] = v;
        return origSetHeader.apply(xhr, arguments);
      };

      var origSend = xhr.send;
      xhr.send = function (body) {
        if (url && url.indexOf(serverOrigin) !== 0) {
          startTime = Date.now();
          requestCounter++;
          updateBadge();

          queueEvent({
            eventId: generateId("xreq_"),
            appName: defaultAppName,
            timestamp: startTime,
            type: "network:req",
            requestId: reqId,
            method: method,
            url: url,
            headers: reqHeaders,
            body: typeof body === "string" ? body : undefined,
          });

          xhr.addEventListener("loadend", function () {
            var durationMs = Date.now() - startTime;
            var rawHeaders = xhr.getAllResponseHeaders() || "";
            var resHeaders = {};
            rawHeaders
              .trim()
              .split(/[\\r\\n]+/)
              .forEach(function (line) {
                var parts = line.split(": ");
                var header = parts.shift();
                var val = parts.join(": ");
                if (header) resHeaders[header.toLowerCase()] = val;
              });

            queueEvent({
              eventId: generateId("xres_"),
              appName: defaultAppName,
              timestamp: Date.now(),
              type: "network:res",
              requestId: reqId,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: resHeaders,
              body: xhr.responseText || undefined,
              durationMs: durationMs,
              error: xhr.status >= 400 ? ("HTTP " + xhr.status) : (xhr.status === 0 ? "Network Failed" : undefined),
            });
          });
        }

        return origSend.apply(xhr, arguments);
      };

      return xhr;
    }

    CustomXHR.prototype = OriginalXHR.prototype;
    window.XMLHttpRequest = CustomXHR;
  }

  // 4. Subtle Floating Status Indicator Badge
  var badgeElem = null;
  function updateBadge() {
    if (!enableBadge || typeof document === "undefined" || !document.body) return;
    if (!badgeElem) {
      badgeElem = document.createElement("div");
      badgeElem.id = "vh-logs-badge";
      badgeElem.style.cssText =
        "position:fixed;bottom:14px;right:14px;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:11px;font-weight:600;display:flex;align-items:center;gap:6px;background:rgba(15,23,42,0.92);color:#f8fafc;padding:6px 12px;border-radius:999px;border:1px solid rgba(56,189,248,0.4);box-shadow:0 8px 20px rgba(0,0,0,0.35);backdrop-filter:blur(8px);cursor:pointer;transition:transform 0.15s ease;";
      
      badgeElem.onmouseenter = function () { badgeElem.style.transform = "scale(1.04)"; };
      badgeElem.onmouseleave = function () { badgeElem.style.transform = "scale(1)"; };
      badgeElem.onclick = function () {
        window.open(serverOrigin, "_blank");
      };
      document.body.appendChild(badgeElem);
    }

    badgeElem.innerHTML =
      '<span style="width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;display:inline-block;"></span>' +
      '<span>VH Logs</span>' +
      '<span style="opacity:0.6;font-size:10px;">•</span>' +
      '<span style="color:#38bdf8;">' + requestCounter + ' req</span>' +
      '<span style="opacity:0.6;font-size:10px;">•</span>' +
      '<span style="color:#a78bfa;">' + logCounter + ' logs</span>';
  }

  if (enableBadge) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", updateBadge);
    } else {
      updateBadge();
    }
  }
})();
`;
