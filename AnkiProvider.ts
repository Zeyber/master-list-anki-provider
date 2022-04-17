import { ProviderOptions, PuppeteerProvider } from "master-list";

export interface AnkiOptions extends ProviderOptions {
  email: string;
  password: string;
}

export const defaultOptions: ProviderOptions = {
  providerName: "Anki",
};

export class AnkiProvider extends PuppeteerProvider {
  constructor(public options: AnkiOptions) {
    super({
      ...defaultOptions,
      ...options,
    });
  }

  initialize(): Promise<boolean> {
    return super.initialize(async () => {
      await this.login();
    });
  }

  reload() {
    return super.reload(async () => {
      return await this.getDecks();
    });
  }

  async login() {
    return new Promise(async (resolve, reject) => {
      try {
        await (async () => {
          await this.page.goto("https://ankiweb.net/account/login", {
            waitUntil: ["load", "networkidle2"],
          });

          const emailField = await this.page.waitForSelector(
            'input[name="username"]'
          );
          await emailField.type(this.settings.email, { delay: 100 });

          const passwordField = await this.page.waitForSelector(
            'input[name="password"]'
          );
          await passwordField.type(this.settings.password, {
            delay: 100,
          });

          const submitButton = await this.page.waitForSelector(
            'input[type="submit"]'
          );
          await submitButton.click();

          await this.page.waitForNavigation();

          resolve(true);
        })();
      } catch (e) {
        reject(e);
      }
    });
  }

  async getDecks(): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      await (async () => {
        try {
          this.page.reload();

          const threadList = await this.page.waitForSelector(
            '[class="container-fluid px-0"]'
          );
          const threads = await threadList.$$(
            '[class="row light-bottom-border"]'
          );
          if (threads.length) {
            const items = [];
            for (const thread of threads) {
              const threadText: string = await this.page.evaluate(
                (el) => el.innerText,
                thread
              );
              const text = threadText.trim().split("\n");
              const deck = {
                name: text[0],
                wordsToRefresh: text[1],
                wordsToLearn: text[2],
              };

              const toDo =
                deck.wordsToLearn !== "0" || deck.wordsToRefresh !== "0";

              if (toDo) {
                items.push(
                  `${deck.name} (${deck.wordsToRefresh}/${deck.wordsToLearn})`
                );
              }
            }
            resolve(items);
          }
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
}
