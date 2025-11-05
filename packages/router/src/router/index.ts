import { Message } from "../message";
import { Handler } from "../handler";
import { EnvProducer, Guard, MessageSender } from "../types";
import { MessageRegistry } from "../encoding";
import { JSONUint8Array } from "../uint8-array";

export abstract class Router {
  protected msgRegistry: MessageRegistry = new MessageRegistry();
  protected registeredHandler: Map<string, Handler> = new Map();

  protected guards: Guard[] = [];

  protected port = "";

  protected _isInitialized: boolean = false;
  protected _initWaiter: Promise<void> | undefined;

  constructor(protected readonly envProducer: EnvProducer) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  public registerMessage(
    msgCls: { new (...args: any): Message<unknown> } & { type(): string }
  ): void {
    this.msgRegistry.registerMessage(msgCls);
  }

  public addHandler(route: string, handler: Handler) {
    if (this.registeredHandler.has(route)) {
      throw new Error(`Already registered type ${route}`);
    }

    this.registeredHandler.set(route, handler);
  }

  public addGuard(guard: Guard): void {
    this.guards.push(guard);
  }

  protected abstract attachHandler(): void;

  protected abstract detachHandler(): void;

  public async listen(
    port: string,
    initFn?: () => Promise<void>
  ): Promise<void> {
    this.port = port;
    this.attachHandler();

    if (initFn) {
      let initWaiter: (() => void) | undefined;
      this._initWaiter = new Promise<void>((resolve) => {
        initWaiter = resolve;
      });
      await initFn();
      initWaiter!();
    }
    this._isInitialized = true;
    return;
  }

  public unlisten(): void {
    this.port = "";
    this.detachHandler();
  }

  protected async handleMessage(
    message: any,
    sender: MessageSender
  ): Promise<unknown> {
    console.log("[Router] handleMessage: starting...");
    
    if (!this.isInitialized) {
      console.log("[Router] handleMessage: waiting for initialization...");
      await this._initWaiter;
      console.log("[Router] handleMessage: initialization complete");
    }

    const msg = this.msgRegistry.parseMessage(JSONUint8Array.unwrap(message));
    console.log("[Router] handleMessage: parsed message:", {
      type: msg.type(),
      route: msg.route()
    });
    
    const env = this.envProducer(sender, msg.routerMeta ?? {});

    for (const guard of this.guards) {
      await guard(env, msg, sender);
    }

    // Can happen throw
    msg.validateBasic();

    const route = msg.route();
    console.log("[Router] handleMessage: route:", route);
    console.log("[Router] handleMessage: registered handlers:", Array.from(this.registeredHandler.keys()));
    
    if (!route) {
      console.error("[Router] handleMessage: route is null");
      throw new Error("Null router");
    }
    
    const handler = this.registeredHandler.get(route);
    console.log("[Router] handleMessage: handler found:", !!handler);
    
    if (!handler) {
      console.error("[Router] handleMessage: handler not found for route:", route);
      throw new Error("Can't get handler");
    }

    console.log("[Router] handleMessage: calling handler...");
    const result = await handler(env, msg);
    console.log("[Router] handleMessage: handler result:", result);
    console.log("[Router] handleMessage: result type:", typeof result);
    console.log("[Router] handleMessage: result is undefined:", result === undefined);
    console.log("[Router] handleMessage: result is null:", result === null);
    
    if (result === undefined) {
      console.error("[Router] handleMessage: handler returned undefined!");
    }
    
    return JSONUint8Array.wrap(result);
  }
}
