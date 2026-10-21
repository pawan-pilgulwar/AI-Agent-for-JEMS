/**
 * `mongodb+srv://` URIs are resolved with Node's own DNS resolver (c-ares),
 * not the OS resolver. On some Windows setups (VPNs, ZeroTier, proxy tools)
 * Node is handed a DNS server that doesn't answer — typically 127.0.0.1 —
 * so the SRV lookup fails with `querySrv ECONNREFUSED` even though
 * `nslookup` works. When that happens we switch Node's resolver to public
 * DNS servers (override with DNS_FALLBACK_SERVERS) and carry on.
 *
 * A genuinely wrong hostname (ENOTFOUND) is left alone so it still errors.
 * CommonJS so both the app (lib/db/mongodb.js) and scripts/ can use it.
 */

const dns = require("dns");

const RESOLVER_FAILURES = new Set(["ECONNREFUSED", "ETIMEOUT", "ESERVFAIL", "ECONNRESET", "EREFUSED"]);

let checked = null;

function ensureSrvDns(uri) {
  if (!uri || !uri.startsWith("mongodb+srv://")) return Promise.resolve();
  if (!checked) checked = check(uri).catch(() => {});
  return checked;
}

async function check(uri) {
  const host = new URL(uri).hostname;
  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
    return; // the default resolver works
  } catch (err) {
    if (!RESOLVER_FAILURES.has(err && err.code)) return;
  }
  const servers = (process.env.DNS_FALLBACK_SERVERS || "8.8.8.8,1.1.1.1")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const before = dns.getServers().join(", ");
  dns.setServers(servers);
  console.warn(`⚠ Node's DNS server (${before}) refused the MongoDB SRV lookup; using ${servers.join(", ")} instead.`);
}

module.exports = { ensureSrvDns };
