import chalk from "chalk";

import { exec } from "../../core/shell/exec";

class NetworkService {
  async discover(target: string) {
    try {
      console.log(chalk.cyan.bold("\n📡 NETWORK DISCOVERY\n"));

      if (target === "localhost") {
        await this.discoverLocal();

        return;
      }

      if (target.includes("/")) {
        await this.discoverSubnet(target);

        return;
      }

      const privateIp = /^(10\.|172\.|192\.168)/.test(target);

      if (privateIp) {
        await this.inspectDevice(target);

        return;
      }

      await this.discoverHost(target);
    } catch (error) {
      console.error(error);
    }
  }
  private async discoverLocal() {
    console.log(chalk.yellow("🌐 Discovering Local Devices\n"));

    const subnet = (
      await exec(
        `
ipconfig getifaddr en0 |
awk -F. '{print $1"."$2"."$3".0/24"}'
`,
        true,
      )
    ).trim();

    console.log(`Subnet : ${subnet}\n`);

    await this.discoverSubnet(subnet);
  }
  private async discoverSubnet(subnet: string) {
    console.log(chalk.yellow("🔍 Scanning subnet...\n"));

    await exec(
      `
for ip in $(seq 1 254)
do
 ping -c 1 -W 1 ${subnet.replace("/24", "")}.$ip >/dev/null 2>&1 &
done

wait
`,
      true,
    );

    const arp = await exec(`arp -a`, true);

    const devices = arp.split("\n").filter(Boolean);

    console.log(chalk.yellow("📱 Devices"));

    for (const line of devices) {
      const ip = line.match(/\((.*?)\)/)?.[1];

      const mac = line.match(/at (.*?) /)?.[1];

      if (!ip) {
        continue;
      }

      console.log(`${chalk.green(ip)} | ${mac || "Unknown MAC"}`);
    }

    console.log(chalk.green("\n✅ Discovery Complete\n"));
  }
  private async inspectDevice(ip: string) {
    console.log(chalk.yellow("🖥 Device Inspection\n"));

    const hostname = (await exec(`nslookup ${ip}`, true))
      .split("\n")
      .find((x) => x.includes("name"));

    console.log(`IP        : ${ip}`);

    console.log(`Hostname  : ${hostname || "Unknown"}`);

    console.log("\nScanning ports...\n");

    await this.ports(
      ip,

      {},
    );
  }
  private async discoverHost(host: string) {
    console.log(chalk.yellow("🌐 Host Discovery\n"));

    const ip = (await exec(`dig +short ${host} | head -n1`, true)).trim();

    const info = JSON.parse(await exec(`curl -s ipinfo.io/${ip}`, true));

    console.log(`Domain     : ${host}`);

    console.log(`IP         : ${ip}`);

    console.log(`Provider   : ${info.org}`);

    console.log(`Country    : ${info.country}`);

    console.log(`Region     : ${info.region}`);

    console.log("\nPort Scan\n");

    await this.ports(
      host,

      {},
    );
  }
  async ports(
    host: string,

    options: {
      extended?: boolean;

      full?: boolean;

      ports?: string;
    },
  ) {
    try {
      console.log(chalk.cyan.bold("\n🔌 PORT SCAN\n"));

      console.log(chalk.yellow("🎯 Target"));

      console.log(`Host : ${host}\n`);

      const DEFAULT = [
        [22, "SSH"],
        [80, "HTTP"],
        [443, "HTTPS"],
        [3306, "MySQL"],
        [5432, "Postgres"],
        [6379, "Redis"],
        [27017, "MongoDB"],
        [3000, "Node"],
        [8080, "HTTP Alt"],
        [21, "FTP"],
        [25, "SMTP"],
        [53, "DNS"],
        [110, "POP3"],
        [143, "IMAP"],
      ];

      const EXTENDED = [
        ...DEFAULT,

        [23, "TELNET"],
        [445, "SMB"],
        [587, "SMTP"],
        [993, "IMAPS"],
        [995, "POP3S"],
        [3389, "RDP"],
        [5900, "VNC"],
        [9200, "Elastic"],
        [8443, "HTTPS Alt"],
        [9092, "Kafka"],
        [2375, "Docker"],
        [27018, "Mongo Replica"],
        [5000, "Flask"],
        [4000, "Dev"],
      ];

      let ports: any;

      if (options.ports) {
        ports = options.ports
          .split(",")

          .map((x) => Number(x.trim()))

          .filter(Boolean)

          .map((p) => [p, "Custom"]);
      } else if (options.full) {
        ports = Array.from(
          {
            length: 65535,
          },

          (_, i) => [i + 1, "Unknown"],
        );
      } else if (options.extended) {
        ports = EXTENDED;
      } else {
        ports = DEFAULT;
      }

      console.log(chalk.yellow("🔎 Scanning"));

      console.log(`Ports : ${ports.length}\n`);

      const start = Date.now();

      const BATCH = options.full ? 100 : 50;

      const openPorts = [];

      for (let i = 0; i < ports.length; i += BATCH) {
        const chunk = ports.slice(i, i + BATCH);

        const results = await Promise.all(
          chunk.map(async ([port, service]: any) => {
            try {
              await exec(
                `
nc \
-z \
-G 1 \
${host} \
${port}
`,
                true,
              );

              return {
                port,

                service,

                open: true,
              };
            } catch {
              return null;
            }
          }),
        );

        openPorts.push(...results.filter(Boolean));

        process.stdout.write(
          `Progress : ${Math.min(i + BATCH, ports.length)}/${ports.length}\r`,
        );
      }

      console.log("\n");

      console.log(chalk.yellow("📂 Open Ports"));

      if (!openPorts.length) {
        console.log(chalk.red("No open ports found"));
      }

      openPorts.forEach((port) => {
        console.log(`${chalk.green(port.port)} → ${port.service}`);
      });

      console.log("\n");

      console.log(chalk.yellow("📊 Summary"));

      console.log(`Ports Checked : ${ports.length}`);

      console.log(`Open Ports    : ${openPorts.length}`);

      console.log(`Scan Time     : ${Date.now() - start} ms`);

      console.log("\n");

      console.log(chalk.yellow("🚨 Analysis"));

      if (openPorts.some((x) => x.port === 22)) {
        console.log(chalk.yellow("SSH reachable from internet"));
      }

      const databases = openPorts.filter((x) =>
        [3306, 5432, 6379, 27017].includes(x.port),
      );

      if (databases.length) {
        console.log(chalk.red("Database services exposed"));
      }

      console.log(chalk.green("\n✅ Scan complete\n"));
    } catch (error) {
      console.log(chalk.red("❌ Scan failed"));

      console.error(error);
    }
  }
  async trace(host: string) {
    try {
      console.log(chalk.cyan.bold("\n🛰 NETWORK TRACE\n"));

      console.log(chalk.yellow("🎯 Target"));

      console.log(`Host : ${host}\n`);

      const resolvedIp = (
        await exec(`dig +short ${host} | head -n1`, true)
      ).trim();

      console.log(chalk.yellow("🌍 DNS Resolution"));

      console.log(`Resolved IP : ${resolvedIp}\n`);

      console.log(chalk.gray("Fast tracing...\n"));

      const raw = await exec(
        `
traceroute \
-m 8 \
-q 1 \
-w 200 \
-n \
${host}
`,
        true,
      );

      const hops = raw.split("\n").slice(1).filter(Boolean);

      const uniqueIps = new Set<string>();

      let timeoutCount = 0;

      let latencyTotal = 0;

      let latencyCount = 0;

      for (const hop of hops) {
        const ip = hop.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1];

        if (ip && !ip.match(/^(10\.|172\.|192\.168|127\.|169\.254)/)) {
          uniqueIps.add(ip);
        }
      }

      console.log(chalk.gray(`Enriching ${uniqueIps.size} public hops...\n`));

      const ipCache = new Map();

      await Promise.all(
        [...uniqueIps].map(async (ip) => {
          try {
            const result = await exec(
              `curl -s --max-time 1 ipinfo.io/${ip}`,
              true,
            );

            ipCache.set(ip, JSON.parse(result));
          } catch {}
        }),
      );

      console.log(chalk.yellow("📍 Hop Details"));

      for (const hop of hops) {
        const cleaned = hop.trim();

        if (cleaned.includes("*")) {
          timeoutCount++;

          console.log(chalk.red(cleaned));

          continue;
        }

        const ip = cleaned.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1];

        const latency = cleaned.match(/([0-9.]+)\s*ms/)?.[1];

        if (latency) {
          latencyTotal += Number(latency);

          latencyCount++;
        }

        let extra = "";

        if (ipCache.has(ip)) {
          const info = ipCache.get(ip);

          extra = chalk.gray(
            ` | ${info.org || "Unknown"} | ${info.country || ""}`,
          );
        } else if (ip) {
          extra = chalk.gray(" | Private");
        }

        console.log(`${cleaned}${extra}`);
      }

      console.log("");

      console.log(chalk.yellow("📊 Statistics"));

      console.log(`Hop Count      : ${hops.length}`);

      console.log(`Timeout Hops   : ${timeoutCount}`);

      console.log(`Public Hops    : ${uniqueIps.size}`);

      console.log(
        `Avg Latency    : ${
          latencyCount ? (latencyTotal / latencyCount).toFixed(2) : "N/A"
        } ms`,
      );

      console.log("");

      console.log(chalk.yellow("🚨 Analysis"));

      if (timeoutCount > 2) {
        console.log(chalk.yellow("Packet filtering detected"));
      }

      console.log(chalk.green("\n✅ Trace complete\n"));
    } catch (error) {
      console.log(chalk.red("❌ Trace failed"));

      console.error(error);
    }
  }
  async ssl(domain: string) {
    try {
      console.log(chalk.cyan.bold("\n🔐 SSL INSPECT\n"));

      console.log(`Domain : ${domain}\n`);

      const cert = await exec(
        `
echo | openssl s_client \
-connect ${domain}:443 \
-servername ${domain} \
-status \
2>/dev/null |
openssl x509 -text -fingerprint -noout
`,
        true,
      );

      const subject = cert.match(/Subject:\s*(.*)/)?.[1] || "Unknown";

      const issuer = cert.match(/Issuer:\s*(.*)/)?.[1] || "Unknown";

      const issued = cert.match(/Not Before:\s*(.*)/)?.[1] || "Unknown";

      const expiry = cert.match(/Not After :\s*(.*)/)?.[1] || "Unknown";

      const serial =
        cert.match(/Serial Number:\s*([A-Fa-f0-9:\s]+)/)?.[1]?.trim() ||
        "Unknown";

      const signature =
        cert.match(/Signature Algorithm:\s*(.*)/)?.[1] || "Unknown";

      const keySize = cert.match(/Public-Key: \((.*?) bit\)/)?.[1] || "Unknown";

      const fingerprint = cert.match(/SHA1 Fingerprint=(.*)/)?.[1] || "Unknown";

      const org = subject.match(/O\s*=\s*([^,]+)/)?.[1];

      const country = subject.match(/C\s*=\s*([^,]+)/)?.[1];

      const sans = [...cert.matchAll(/DNS:([^,\n]+)/g)].map((m) => m[1]);

      const protocol = await exec(
        `
echo | openssl s_client \
-connect ${domain}:443 \
-servername ${domain} \
2>/dev/null |
grep "Protocol"
`,
        true,
      );

      const cipher = await exec(
        `
echo | openssl s_client \
-connect ${domain}:443 \
-servername ${domain} \
2>/dev/null |
grep "Cipher is"
`,
        true,
      );

      const verify = await exec(
        `
echo | openssl s_client \
-connect ${domain}:443 \
-servername ${domain} \
2>/dev/null |
grep "Verify return code"
`,
        true,
      );

      const headers = await exec(`curl -I -s https://${domain}`, true);

      const expiryDate = new Date(expiry);

      const issuedDate = new Date(issued);

      const daysLeft = Math.ceil(
        (expiryDate.getTime() - Date.now()) / 86400000,
      );

      const certAge = Math.floor(
        (Date.now() - issuedDate.getTime()) / 86400000,
      );

      const wildcard = sans.some((s) => s.includes("*"));

      const selfSigned = issuer === subject;

      const hsts = headers.toLowerCase().includes("strict-transport-security");

      const ocsp = headers.toLowerCase().includes("ocsp");

      console.log(chalk.yellow("🏢 Ownership"));

      console.log(`Subject       : ${subject}`);

      console.log(`Organization  : ${org || "Not Available"}`);

      console.log(`Country       : ${country || "Not Available"}`);

      console.log(`Issued By     : ${issuer}`);

      console.log("");

      console.log(chalk.yellow("📅 Validity"));

      console.log(`Issued On     : ${issued}`);

      console.log(`Expires On    : ${expiry}`);

      console.log(`Cert Age      : ${certAge} days`);

      console.log(`Days Left     : ${daysLeft}`);

      console.log("");

      console.log(chalk.yellow("🔒 Security"));

      console.log(protocol.trim());

      console.log(cipher.trim());

      console.log(`Public Key    : ${keySize} bit`);

      console.log(`Signature     : ${signature}`);

      console.log(`Fingerprint   : ${fingerprint}`);

      console.log(`Serial        : ${serial}`);

      console.log("");

      console.log(chalk.yellow("🛡 Trust"));

      console.log(`Self Signed   : ${selfSigned ? "Yes" : "No"}`);

      console.log(`Trust Status  : ${verify.trim()}`);

      console.log("");

      console.log(chalk.yellow("🌍 Domains"));

      console.log(`Wildcard      : ${wildcard ? "Yes" : "No"}`);

      console.log(`SAN Count     : ${sans.length}`);

      sans.slice(0, 10).forEach((s) => console.log(`  • ${s}`));

      if (sans.length > 10) {
        console.log(`  ... +${sans.length - 10} more`);
      }

      console.log("");

      console.log(chalk.yellow("⚙ Transport"));

      console.log(`HSTS          : ${hsts ? "Enabled" : "Disabled"}`);

      console.log(`OCSP          : ${ocsp ? "Present" : "Not Found"}`);

      console.log("");

      console.log(chalk.yellow("🚨 Status"));

      if (daysLeft < 15) {
        console.log(chalk.red("Certificate expiring soon"));
      } else if (daysLeft < 45) {
        console.log(chalk.yellow("Monitor renewal"));
      } else {
        console.log(chalk.green("Healthy certificate"));
      }

      console.log(chalk.green("\n✅ SSL inspection complete\n"));
    } catch (error) {
      console.log(chalk.red("❌ SSL inspection failed"));

      console.error(error);
    }
  }

  async inspect(input: string) {
    try {
      const domain = input.replace(/^https?:\/\//, "").split("/")[0];

      const random = Date.now();

      const testUrl = `${input}${
        input.includes("?") ? "&" : "?"
      }nocache=${random}`;

      console.log(chalk.cyan.bold("\n🌐 NETWORK INSPECT"));

      console.log(chalk.gray(`Target : ${input}`));

      console.log(chalk.gray(`Domain : ${domain}`));

      console.log("");

      await this.showDns(domain);

      await this.showIp(domain);

      await this.showRedirects(input);

      await this.showHeaders(input);

      await this.showStats(testUrl, false);

      await this.showStats(testUrl, true);

      console.log(chalk.green("\n✅ Done\n"));
    } catch (error) {
      console.log(chalk.red("\n❌ Inspection failed"));

      console.error(error);
    }
  }

  private formatTime(value: string) {
    const num = Number(value);

    if (num < 1) {
      return `${(num * 1000).toFixed(3)} ms`;
    }

    return `${num.toFixed(3)} s`;
  }

  private async showDns(domain: string) {
    console.log(chalk.yellow("📡 DNS"));

    const resolver = "8.8.8.8";

    console.log(chalk.gray("\nResolver Used:"));

    console.log(`  ${resolver} (Google DNS)`);

    const ns = await exec(`dig NS +short ${domain}`, true);

    const nameservers = ns.split("\n").filter(Boolean);

    console.log(chalk.gray("\nNameservers:"));

    if (nameservers.length) {
      nameservers.forEach((server) => console.log(`  ${server}`));
    } else {
      console.log("  none");
    }

    const cname = await exec(`dig CNAME +short ${domain}`, true);

    console.log(chalk.gray("\nCNAME:"));

    console.log(cname.trim() || "  none");

    const records = await exec(`dig A +short ${domain}`, true);

    console.log(chalk.gray("\nA Records:"));

    records
      .split("\n")
      .filter(Boolean)
      .forEach((ip) => {
        console.log(`  ${domain} → ${chalk.green(ip)}`);
      });

    console.log("");
  }

  private async showIp(domain: string) {
    const ip = (await exec(`dig +short ${domain} | head -n1`, true)).trim();

    console.log(chalk.yellow("🌍 IP INFO"));

    console.log(`Resolved IP : ${chalk.green(ip)}`);

    if (!ip) {
      console.log("");

      return;
    }

    const raw = await exec(`curl -s ipinfo.io/${ip}`, true);

    const info = JSON.parse(raw);

    console.log(`Country     : ${info.country}`);

    console.log(`City        : ${info.city}`);

    console.log(`Region      : ${info.region}`);

    console.log(`Provider    : ${info.org}`);

    console.log(`Timezone    : ${info.timezone}`);

    console.log("");
  }

  private async showRedirects(url: string) {
    console.log(chalk.yellow("↪ Redirect Chain"));

    const chain = await exec(
      `
curl -sIL "${url}" |
grep -Ei "HTTP/|location:"
`,
      true,
    );

    console.log(chain.trim() || "No redirects");

    console.log("");
  }

  private async showHeaders(url: string) {
    console.log(chalk.yellow("🖥 Headers"));

    const headers = await exec(`curl -I -s "${url}"`, true);

    headers
      .split("\n")
      .filter((line) => {
        const lower = line.toLowerCase();

        return (
          lower.startsWith("server") ||
          lower.startsWith("cache-control") ||
          lower.startsWith("content-type")
        );
      })
      .forEach((line) => console.log(line.trim()));

    console.log("");
  }

  private async showStats(
    url: string,

    follow: boolean,
  ) {
    console.log(
      chalk.yellow(follow ? "📊 With Redirects" : "📊 Without Redirects"),
    );

    const raw = await exec(
      `
curl ${follow ? "-L" : ""} \
-o /dev/null \
-s \
-w "
HTTP:%{http_code}
DNS:%{time_namelookup}
TCP:%{time_connect}
TLS:%{time_appconnect}
TTFB:%{time_starttransfer}
TOTAL:%{time_total}
REDIRECT:%{time_redirect}
COUNT:%{num_redirects}
REMOTE:%{remote_ip}
TYPE:%{content_type}
" \
"${url}"
`,
      true,
    );

    const stats = Object.fromEntries(
      raw
        .trim()
        .split("\n")
        .map((line) => line.split(":")),
    );

    console.log(`HTTP        : ${stats.HTTP}`);

    console.log(`DNS         : ${this.formatTime(stats.DNS)}`);

    console.log(`TCP         : ${this.formatTime(stats.TCP)}`);

    console.log(`TLS         : ${this.formatTime(stats.TLS)}`);

    console.log(`TTFB        : ${this.formatTime(stats.TTFB)}`);

    console.log(`TOTAL       : ${this.formatTime(stats.TOTAL)}`);

    console.log(`REDIRECT    : ${this.formatTime(stats.REDIRECT)}`);

    console.log(`COUNT       : ${stats.COUNT}`);

    console.log(`REMOTE IP   : ${stats.REMOTE}`);

    console.log(`TYPE        : ${stats.TYPE}`);

    const total = Number(stats.TOTAL);

    if (total > 1) {
      console.log(chalk.red("⚠ Slow response detected"));
    }

    console.log("");
  }
}

export const networkService = new NetworkService();
