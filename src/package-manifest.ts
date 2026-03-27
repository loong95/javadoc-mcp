import fs from "node:fs";

export type PackageManifest = {
  name?: string;
  version?: string;
};

export function readPackageManifest(): PackageManifest {
  return JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8")
  ) as PackageManifest;
}
