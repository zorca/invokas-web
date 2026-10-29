export function runtimeProblem(protocol: string, hostname: string, allowedHosts: string): "protocol" | "host" | null {
  if (protocol !== "https:" && protocol !== "http:") return "protocol";
  const hosts = allowedHosts.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  if (hosts.length && !hosts.includes(hostname.toLowerCase())) return "host";
  return null;
}
