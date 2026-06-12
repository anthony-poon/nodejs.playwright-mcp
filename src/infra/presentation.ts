import * as readline from "node:readline/promises";

export interface Presentation {
  println(message: string): void;
  prompt(question: string): Promise<string>;
  close(): void;
}

export class CliPresentation implements Presentation {
  private readonly rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  public println(message: string): void {
    console.log(message);
  }

  public async prompt(question: string): Promise<string> {
    const answer = await this.rl.question(`${question} `);
    return answer.trim();
  }

  public close(): void {
    this.rl.close();
  }
}
