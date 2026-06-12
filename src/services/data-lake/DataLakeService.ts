import fs from "node:fs";

type DataLakeServiceConfig = {
  path: string
}

export class DataLakeService {
  private readonly basePath: string
  constructor(config: DataLakeServiceConfig) {
    this.basePath = config.path;

  }
  public save(namespace: string|string[], payload: object) {
    const segments = typeof namespace === "string" ? [namespace] : namespace;

    if (segments.length === 0) {
      throw new Error("Namespace must not be empty");
    }

    for (const segment of segments) {
      if (segment.length === 0) {
        throw new Error("Namespace segments must not be empty strings");
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
        throw new Error(`Invalid namespace segment: "${segment}". Only alphanumeric, dash, and underscore are allowed`);
      }
    }

    const dir = `${this.basePath}/${segments.join('/')}`;
    fs.mkdirSync(dir, { recursive: true });

    const file = `${dir}/${Date.now()}.json`;
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), { flag: "w" });
  }
}